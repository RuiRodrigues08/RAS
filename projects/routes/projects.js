var express = require("express");
var router = express.Router();
const axios = require("axios");

const multer = require("multer");
const FormData = require("form-data");

const fs = require("fs");
const fs_extra = require("fs-extra");
const path = require("path");
const mime = require("mime-types");

const JSZip = require("jszip");

const { v4: uuidv4 } = require("uuid");
const {
  send_msg_tool,
  send_msg_client,
  send_msg_client_error,
  send_msg_client_preview,
  send_msg_client_preview_error,
  read_msg,
} = require("../utils/project_msg");

const Project = require("../controllers/project");
const Process = require("../controllers/process");
const Result = require("../controllers/result");
const Preview = require("../controllers/preview");
const ShareLink = require("../controllers/sharelink");
const { handleShareToken } = require("../middlewares/handleShareToken");
const {
  get_image_docker,
  get_image_host,
  post_image,
  delete_image,
} = require("../utils/minio");

const storage = multer.memoryStorage();
var upload = multer({ storage: storage });

const key = fs.readFileSync(__dirname + "/../certs/selfsigned.key");
const cert = fs.readFileSync(__dirname + "/../certs/selfsigned.crt");

const https = require("https");
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  cert: cert,
  key: key,
});

const users_ms = "https://users:10001/";
const minio_domain = process.env.MINIO_DOMAIN;

const advanced_tools = [
  "cut_ai",
  "upgrade_ai",
  "bg_remove_ai",
  "text_ai",
  "obj_ai",
  "people_ai",
];

function advanced_tool_num(project) {
  const tools = project.tools;
  let ans = 0;

  for (let t of tools) {
    if (advanced_tools.includes(t.procedure)) ans++;
  }

  ans *= project.imgs.length;

  return ans;
}

function process_msg() {
  read_msg(async (msg) => {
    let user_msg_id;
    let timestamp;
    let process;

    try {
      const msg_content = JSON.parse(msg.content.toString());
      const msg_id = msg_content.correlationId;
      timestamp = new Date().toISOString();

      user_msg_id = `update-client-process-${uuidv4()}`;

      process = await Process.getOne(msg_id);

      if (!process) {
        console.log(
          `Process ${msg_id} not found. It was likely cancelled by the user.`
        );
        return;
      }

      const notificationTarget = process.requestor_id || process.user_id;

      const prev_process_input_img = process.og_img_uri;
      const prev_process_output_img = process.new_img_uri;

      const og_img_uri = process.og_img_uri;
      const img_id = process.img_id;

      await Process.delete(process.user_id, process.project_id, process._id);

      if (msg_content.status === "error") {
        console.log(JSON.stringify(msg_content));
        if (/preview/.test(msg_id)) {
          send_msg_client_preview_error(
            `update-client-preview-${uuidv4()}`,
            timestamp,
            notificationTarget,
            msg_content.error.code,
            msg_content.error.msg
          );
        } else {
          send_msg_client_error(
            user_msg_id,
            timestamp,
            notificationTarget,
            msg_content.error.code,
            msg_content.error.msg
          );
        }
        return;
      }

      const output_file_uri = msg_content.output.imageURI;
      const type = msg_content.output.type;
      const project = await Project.getOne(process.user_id, process.project_id);

      const next_pos = process.cur_pos + 1;

      if (
        /preview/.test(msg_id) &&
        (type == "text" || next_pos >= project.tools.length)
      ) {
        const file_path = path.join(__dirname, `/../${output_file_uri}`);
        const file_name = path.basename(file_path);
        const fileStream = fs.createReadStream(file_path);

        const data = new FormData();
        await data.append(
          "file",
          fileStream,
          path.basename(file_path),
          mime.lookup(file_path)
        );

        const resp = await post_image(
          process.user_id,
          process.project_id,
          "preview",
          data
        );

        const og_key_tmp = resp.data.data.imageKey.split("/");
        const og_key = og_key_tmp[og_key_tmp.length - 1];

        const preview = {
          type: type,
          file_name: file_name,
          img_key: og_key,
          img_id: img_id,
          project_id: process.project_id,
          user_id: process.user_id,
        };

        await Preview.create(preview);

        if (next_pos >= project.tools.length) {
          const previews = await Preview.getAll(
            process.user_id,
            process.project_id
          );

          let urls = {
            imageUrl: "",
            textResults: [],
          };

          for (let p of previews) {
            const url_resp = await get_image_host(
              process.user_id,
              process.project_id,
              "preview",
              p.img_key
            );

            const url = url_resp.data.url;

            if (p.type != "text") urls.imageUrl = url;
            else urls.textResults.push(url);
          }

          send_msg_client_preview(
            `update-client-preview-${uuidv4()}`,
            timestamp,
            notificationTarget,
            JSON.stringify(urls)
          );
        }
      }

      if (/preview/.test(msg_id) && next_pos >= project.tools.length) return;

      if (!/preview/.test(msg_id))
        send_msg_client(user_msg_id, timestamp, notificationTarget);

      if (
        !/preview/.test(msg_id) &&
        (type == "text" || next_pos >= project.tools.length)
      ) {
        const file_path = path.join(__dirname, `/../${output_file_uri}`);
        const file_name = path.basename(file_path);
        const fileStream = fs.createReadStream(file_path);

        const data = new FormData();
        await data.append(
          "file",
          fileStream,
          path.basename(file_path),
          mime.lookup(file_path)
        );

        const resp = await post_image(
          process.user_id,
          process.project_id,
          "out",
          data
        );

        const og_key_tmp = resp.data.data.imageKey.split("/");
        const og_key = og_key_tmp[og_key_tmp.length - 1];

        const result = {
          type: type,
          file_name: file_name,
          img_key: og_key,
          img_id: img_id,
          project_id: process.project_id,
          user_id: process.user_id,
        };

        await Result.create(result);
      }

      if (next_pos >= project.tools.length) return;

      const new_msg_id = /preview/.test(msg_id)
        ? `preview-${uuidv4()}`
        : `request-${uuidv4()}`;

      const tool = project.tools.filter((t) => t.position == next_pos)[0];

      const tool_name = tool.procedure;
      const params = tool.params;

      const read_img =
        type == "text" ? prev_process_input_img : output_file_uri;
      const output_img =
        type == "text" ? prev_process_output_img : output_file_uri;

      const new_process = {
        user_id: process.user_id,
        requestor_id: process.requestor_id || null,
        project_id: process.project_id,
        img_id: img_id,
        msg_id: new_msg_id,
        cur_pos: next_pos,
        og_img_uri: read_img,
        new_img_uri: output_img,
      };

      await Process.create(new_process);
      send_msg_tool(
        new_msg_id,
        timestamp,
        new_process.og_img_uri,
        new_process.new_img_uri,
        tool_name,
        params
      );
    } catch (error) {
      if (user_msg_id && timestamp && process) {
        const notificationTarget = process.requestor_id || process.user_id;
        send_msg_client_error(
          user_msg_id,
          timestamp,
          notificationTarget,
          "30000",
          "An error happened while processing the project: " + error.message
        );
        return;
      }
    }
  });
}

router.get("/:user", (req, res, next) => {
  Project.getAll(req.params.user)
    .then((projects) => {
      const ans = [];

      for (let p of projects) {
        ans.push({
          _id: p._id,
          name: p.name,
        });
      }

      res.status(200).jsonp(ans);
    })
    .catch((_) => res.status(500).jsonp("Error acquiring user's projects"));
});

router.post("/:user", (req, res, next) => {
  const project = {
    name: req.body.name,
    user_id: req.params.user,
    imgs: [],
    tools: [],
  };

  Project.create(project)
    .then((project) => res.status(201).jsonp(project))
    .catch((_) => res.status(502).jsonp(`Error creating new project`));
});

router.use("/:user/:project", handleShareToken);

router.get("/:user/:project", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);
    if (!project) return res.status(404).jsonp("Project not found");

    const response = {
      _id: project._id,
      name: project.name,
      tools: project.tools,
      imgs: [],
    };

    for (let img of project.imgs) {
      try {
        const resp = await get_image_host(
          req.projectOwner,
          req.params.project,
          "src",
          img.og_img_key
        );
        const url = resp.data.url;

        response["imgs"].push({
          _id: img._id,
          name: path.basename(img.og_uri),
          url: url,
        });
      } catch (_) {
        return res.status(404).jsonp(`Error acquiring image's url`);
      }
    }

    res.status(200).jsonp(response);
  } catch (_) {
    res.status(501).jsonp(`Error acquiring user's project`);
  }
});

router.get("/:user/:project/img/:img", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);
    const img = project.imgs.filter((i) => i._id == req.params.img)[0];
    const resp = await get_image_host(
      req.projectOwner,
      req.params.project,
      "src",
      img.og_img_key
    );
    res.status(200).jsonp({
      _id: img._id,
      name: path.basename(img.og_uri),
      url: resp.data.url,
    });
  } catch (_) {
    res.status(404).jsonp("No image with such id.");
  }
});

router.get("/:user/:project/imgs", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);
    const ans = [];

    for (let img of project.imgs) {
      try {
        const resp = await get_image_host(
          req.projectOwner,
          req.params.project,
          "src",
          img.og_img_key
        );
        const url = resp.data.url;

        ans.push({
          _id: img._id,
          name: path.basename(img.og_uri),
          url: url,
        });
      } catch (_) {
        return res.status(404).jsonp(`Error acquiring image's url`);
      }
    }
    res.status(200).jsonp(ans);
  } catch (_) {
    res.status(501).jsonp(`Error acquiring user's project`);
  }
});

router.get("/:user/:project/process", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);
    const zip = new JSZip();
    const results = await Result.getAll(req.projectOwner, req.params.project);

    const result_path = `/../images/users/${req.projectOwner}/projects/${req.params.project}/tmp`;

    fs.mkdirSync(path.join(__dirname, result_path), { recursive: true });

    for (let r of results) {
      const res_path = path.join(__dirname, result_path, r.file_name);

      const resp = await get_image_docker(
        r.user_id,
        r.project_id,
        "out",
        r.img_key
      );
      const url = resp.data.url;

      const file_resp = await axios.get(url, { responseType: "stream" });
      const writer = fs.createWriteStream(res_path);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
        file_resp.data.pipe(writer);
      });

      const fs_res = fs.readFileSync(res_path);
      zip.file(r.file_name, fs_res);
    }

    fs.rmSync(path.join(__dirname, result_path), {
      recursive: true,
      force: true,
    });

    const ans = await zip.generateAsync({ type: "blob" });

    res.type(ans.type);
    res.set(
      "Content-Disposition",
      `attachment; filename=user_${req.projectOwner}_project_${req.params.project}_results.zip`
    );
    const b = await ans.arrayBuffer();
    res.status(200).send(Buffer.from(b));
  } catch (_) {
    res.status(601).jsonp(`Error acquiring project's processing result`);
  }
});

router.get("/:user/:project/process/url", async (req, res, next) => {
  try {
    const ans = {
      imgs: [],
      texts: [],
    };
    const results = await Result.getAll(req.projectOwner, req.params.project);

    for (let r of results) {
      const resp = await get_image_host(
        req.projectOwner,
        req.params.project,
        "out",
        r.img_key
      );
      const url = resp.data.url;

      if (r.type == "text")
        ans.texts.push({ og_img_id: r.img_id, name: r.file_name, url: url });
      else ans.imgs.push({ og_img_id: r.img_id, name: r.file_name, url: url });
    }

    res.status(200).jsonp(ans);
  } catch (_) {
    res.status(601).jsonp(`Error acquiring project's processing result`);
  }
});

router.get("/:user/:project/advanced_tools", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);
    const tools = project.tools;
    let ans = 0;

    for (let t of tools) {
      if (advanced_tools.includes(t.procedure)) ans++;
    }

    ans *= project.imgs.length;
    res.status(200).jsonp(ans);
  } catch (_) {
    res.status(501).jsonp(`Error acquiring user's project`);
  }
});

router.post("/:user/:project/preview/:img", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);

    if (!project) return res.status(404).jsonp("Project not found");

    const prev_preview = await Preview.getAll(
      req.projectOwner,
      req.params.project
    );

    for (let p of prev_preview) {
      await delete_image(
        req.projectOwner,
        req.params.project,
        "preview",
        p.img_key
      );
      await Preview.delete(req.projectOwner, req.params.project, p.img_id);
    }

    const source_path = `/../images/users/${req.projectOwner}/projects/${req.params.project}/src`;
    const result_path = `/../images/users/${req.projectOwner}/projects/${req.params.project}/preview`;

    if (!fs.existsSync(path.join(__dirname, source_path)))
      fs.mkdirSync(path.join(__dirname, source_path), { recursive: true });

    if (!fs.existsSync(path.join(__dirname, result_path)))
      fs.mkdirSync(path.join(__dirname, result_path), { recursive: true });

    const img = project.imgs.filter((i) => i._id == req.params.img)[0];
    if (!img) return res.status(404).jsonp("Image not found in project");

    const msg_id = `preview-${uuidv4()}`;
    const timestamp = new Date().toISOString();
    const og_img_uri = img.og_uri;
    const img_id = img._id;

    const resp = await get_image_docker(
      req.projectOwner,
      req.params.project,
      "src",
      img.og_img_key
    );
    const url = resp.data.url;

    const img_resp = await axios.get(url, { responseType: "stream" });
    const writer = fs.createWriteStream(og_img_uri);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
      img_resp.data.pipe(writer);
    });

    const img_name_parts = img.new_uri.split("/");
    const img_name = img_name_parts[img_name_parts.length - 1];

    const new_img_uri = `./images/users/${req.projectOwner}/projects/${req.params.project}/preview/${img_name}`;

    const tool = project.tools.filter((t) => t.position == 0)[0];
    if (!tool) return res.status(400).jsonp("No tools configured for preview");

    const tool_name = tool.procedure;
    const params = tool.params;

    const process = {
      user_id: req.projectOwner,
      requestor_id: req.requestorId || req.projectOwner,
      project_id: req.params.project,
      img_id: img_id,
      msg_id: msg_id,
      cur_pos: 0,
      og_img_uri: og_img_uri,
      new_img_uri: new_img_uri,
    };

    await Process.create(process);

    send_msg_tool(
      msg_id,
      timestamp,
      og_img_uri,
      new_img_uri,
      tool_name,
      params
    );

    return res.sendStatus(201);
  } catch (err) {
    console.error("Preview error:", err);
    if (err.code === "ENOENT") {
      return res.status(500).jsonp("File system error: Could not create paths");
    }
    return res.status(500).jsonp(err?.message || "Error creating preview");
  }
});

router.post(
  "/:user/:project/img",
  upload.single("image"),
  async (req, res, next) => {
    if (!req.file) {
      res.status(400).jsonp("No file found");
      return;
    }

    try {
      const project = await Project.getOne(
        req.projectOwner,
        req.params.project
      );
      const same_name_img = project.imgs.filter(
        (i) => path.basename(i.og_uri) == req.file.originalname
      );

      if (same_name_img.length > 0) {
        return res
          .status(400)
          .jsonp("This project already has an image with that name.");
      }

      const data = new FormData();
      data.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      const resp = await post_image(
        req.projectOwner,
        req.params.project,
        "src",
        data
      );

      const og_key_tmp = resp.data.data.imageKey.split("/");
      const og_key = og_key_tmp[og_key_tmp.length - 1];

      const og_uri = `./images/users/${req.projectOwner}/projects/${req.params.project}/src/${req.file.originalname}`;
      const new_uri = `./images/users/${req.projectOwner}/projects/${req.params.project}/out/${req.file.originalname}`;

      project["imgs"].push({
        og_uri: og_uri,
        new_uri: new_uri,
        og_img_key: og_key,
      });

      await Project.update(req.projectOwner, req.params.project, project);
      res.sendStatus(204);
    } catch (_) {
      res.status(501).jsonp(`Error adding image`);
    }
  }
);

router.post("/:user/:project/tool", async (req, res, next) => {
  if (!req.body.procedure || !req.body.params) {
    return res
      .status(400)
      .jsonp(`A tool should have a procedure and corresponding parameters`);
  }

  let required_types = ["free", "premium"];

  if (!advanced_tools.includes(req.body.procedure))
    required_types.push("anonymous");

  try {
    const resp = await axios.get(users_ms + `${req.params.user}/type`, {
      httpsAgent: httpsAgent,
    });

    if (!required_types.includes(resp.data.type)) {
      return res.status(403).jsonp(`User type can't use this tool`);
    }

    const project = await Project.getOne(req.projectOwner, req.params.project);
    console.log(project);

    const tool = {
      position: project["tools"].length,
      ...req.body,
    };

    project["tools"].push(tool);

    await Project.update(req.projectOwner, req.params.project, project);
    res.sendStatus(204);
  } catch (err) {
    console.error("Error adding tool:", err);
    res.status(501).jsonp(`Error acquiring user's project`);
  }
});

router.post("/:user/:project/reorder", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);
    project["tools"] = [];

    for (let t of req.body) {
      const tool = {
        position: project["tools"].length,
        ...t,
      };
      project["tools"].push(tool);
    }

    await Project.update(req.projectOwner, req.params.project, project);
    res.status(204).jsonp(project);
  } catch (_) {
    res.status(501).jsonp(`Error acquiring user's project`);
  }
});

router.post("/:user/:project/process", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);

    try {
      const prev_results = await Result.getAll(
        req.projectOwner,
        req.params.project
      );
      for (let r of prev_results) {
        await delete_image(
          req.projectOwner,
          req.params.project,
          "out",
          r.img_key
        );
        await Result.delete(r.user_id, r.project_id, r.img_id);
      }
    } catch (_) {
      return res.status(400).jsonp("Error deleting previous results");
    }

    if (project.tools.length == 0) {
      return res.status(400).jsonp("No tools selected");
    }

    const adv_tools = advanced_tool_num(project);
    const resp = await axios.get(
      users_ms + `${req.projectOwner}/process/${adv_tools}`,
      {
        httpsAgent: httpsAgent,
      }
    );
    const can_process = resp.data;

    if (!can_process) {
      return res
        .status(404)
        .jsonp("No more premium daily operations available");
    }

    const source_path = `/../images/users/${req.projectOwner}/projects/${req.params.project}/src`;
    const result_path = `/../images/users/${req.projectOwner}/projects/${req.params.project}/out`;

    if (fs.existsSync(path.join(__dirname, source_path)))
      fs.rmSync(path.join(__dirname, source_path), {
        recursive: true,
        force: true,
      });

    fs.mkdirSync(path.join(__dirname, source_path), { recursive: true });

    if (fs.existsSync(path.join(__dirname, result_path)))
      fs.rmSync(path.join(__dirname, result_path), {
        recursive: true,
        force: true,
      });

    fs.mkdirSync(path.join(__dirname, result_path), { recursive: true });

    let error = false;

    for (let img of project.imgs) {
      let url = "";
      try {
        const resp = await get_image_docker(
          req.projectOwner,
          req.params.project,
          "src",
          img.og_img_key
        );
        url = resp.data.url;

        const img_resp = await axios.get(url, { responseType: "stream" });
        const writer = fs.createWriteStream(img.og_uri);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
          img_resp.data.pipe(writer);
        });
      } catch (_) {
        return res.status(400).jsonp("Error acquiring source images");
      }

      const msg_id = `request-${uuidv4()}`;
      const timestamp = new Date().toISOString();

      const og_img_uri = img.og_uri;
      const new_img_uri = img.new_uri;
      const tool = project.tools.filter((t) => t.position === 0)[0];

      const tool_name = tool.procedure;
      const params = tool.params;

      const process = {
        user_id: req.projectOwner,
        requestor_id: req.requestorId || req.projectOwner,
        project_id: req.params.project,
        img_id: img._id,
        msg_id: msg_id,
        cur_pos: 0,
        og_img_uri: og_img_uri,
        new_img_uri: new_img_uri,
      };

      try {
        await Process.create(process);
        send_msg_tool(
          msg_id,
          timestamp,
          og_img_uri,
          new_img_uri,
          tool_name,
          params
        );
      } catch (_) {
        error = true;
      }
    }

    if (error)
      res
        .status(603)
        .jsonp(
          `There were some erros creating all process requests. Some results can be invalid.`
        );
    else res.sendStatus(201);
  } catch (_) {
    res.status(501).jsonp(`Error acquiring user's project`);
  }
});

router.post("/:user/:project/process/cancel", async (req, res, next) => {
  try {
    await Process.deleteAll(req.projectOwner, req.params.project);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error cancelling process:", error);
    res.status(500).jsonp("Error cancelling processing");
  }
});

router.put("/:user/:project", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);
    project.name = req.body.name || project.name;
    await Project.update(req.projectOwner, req.params.project, project);
    res.sendStatus(204);
  } catch (_) {
    res.status(501).jsonp(`Error acquiring user's project`);
  }
});

router.put("/:user/:project/tool/:tool", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);

    if (!project) return res.status(404).jsonp("Project not found");

    const tool_pos = project["tools"].findIndex(
      (i) => i._id.toString() == req.params.tool
    );

    if (tool_pos === -1)
      return res.status(404).jsonp("Tool not found in this project");

    const prev_tool = project["tools"][tool_pos];

    project["tools"][tool_pos] = {
      position: prev_tool.position,
      procedure: prev_tool.procedure,
      params: req.body.params,
      _id: prev_tool._id,
    };

    await Project.update(req.projectOwner, req.params.project, project);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).jsonp("Error updating tool information");
  }
});

router.delete("/:user/:project", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);
    const previous_img = JSON.parse(JSON.stringify(project["imgs"]));
    for (let img of previous_img) {
      await delete_image(
        req.projectOwner,
        req.params.project,
        "src",
        img.og_img_key
      );
      project["imgs"].remove(img);
    }

    const results = await Result.getAll(req.projectOwner, req.params.project);
    const previews = await Preview.getAll(req.projectOwner, req.params.project);

    for (let r of results) {
      await delete_image(
        req.projectOwner,
        req.params.project,
        "out",
        r.img_key
      );
      await Result.delete(r.user_id, r.project_id, r.img_id);
    }

    for (let p of previews) {
      await delete_image(
        req.projectOwner,
        req.params.project,
        "preview",
        p.img_key
      );
      await Preview.delete(p.user_id, p.project_id, p.img_id);
    }

    await Project.delete(req.projectOwner, req.params.project);
    res.sendStatus(204);
  } catch (_) {
    res.status(504).jsonp(`Error deleting user's project`);
  }
});

router.delete("/:user/:project/img/:img", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);
    const img = project["imgs"].filter((i) => i._id == req.params.img)[0];

    await delete_image(
      req.projectOwner,
      req.params.project,
      "src",
      img.og_img_key
    );
    project["imgs"].remove(img);

    const results = await Result.getOne(
      req.projectOwner,
      req.params.project,
      img._id
    );
    const previews = await Preview.getOne(
      req.projectOwner,
      req.params.project,
      img._id
    );

    if (results) {
      await delete_image(
        req.projectOwner,
        req.params.project,
        "out",
        results.img_key
      );
      await Result.delete(results.user_id, results.project_id, results.img_id);
    }

    if (previews) {
      await delete_image(
        req.projectOwner,
        req.params.project,
        "preview",
        previews.img_key
      );
      await Preview.delete(
        previews.user_id,
        previews.project_id,
        previews.img_id
      );
    }

    await Project.update(req.projectOwner, req.params.project, project);
    res.sendStatus(204);
  } catch (_) {
    res.status(400).jsonp(`Error deleting image information.`);
  }
});

router.delete("/:user/:project/tool/:tool", async (req, res, next) => {
  try {
    const project = await Project.getOne(req.projectOwner, req.params.project);
    const tool = project["tools"].filter((i) => i._id == req.params.tool)[0];

    project["tools"].remove(tool);

    for (let i = 0; i < project["tools"].length; i++) {
      if (project["tools"][i].position > tool.position)
        project["tools"][i].position--;
    }

    await Project.update(req.projectOwner, req.params.project, project);
    res.sendStatus(204);
  } catch (error) {
    console.log(error);
    res.status(400).jsonp(`Error deleting tool's information`);
  }
});

module.exports = { router, process_msg };
