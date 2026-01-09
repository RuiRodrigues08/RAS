var express = require("express");
var router = express.Router();

const axios = require("axios");

const https = require("https");
const fs = require("fs");

const multer = require("multer");
const FormData = require("form-data");

const auth = require("../auth/auth");

const key = fs.readFileSync(__dirname + "/../certs/selfsigned.key");
const cert = fs.readFileSync(__dirname + "/../certs/selfsigned.crt");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  cert: cert,
  key: key,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const projectsURL = "https://projects:9001/";

const getAxiosConfig = (req, extraConfig = {}) => {
  const headers = { ...(extraConfig.headers || {}) };

  if (req.headers["authorization"]) {
    headers["Authorization"] = req.headers["authorization"];
  }

  if (req.headers["x-project-token"]) {
    headers["x-project-token"] = req.headers["x-project-token"];
  }

  return {
    ...extraConfig,
    httpsAgent: httpsAgent,
    headers: headers,
  };
};

/**
 * Get user's projects
 */
router.get("/:user", auth.checkToken, function (req, res, next) {
  axios
    .get(projectsURL + `${req.params.user}`, getAxiosConfig(req))
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => res.status(500).jsonp("Error getting users"));
});

/**
 * Get user's project
 */
router.get("/:user/:project", auth.checkToken, function (req, res, next) {
  axios
    .get(
      projectsURL + `${req.params.user}/${req.params.project}`,
      getAxiosConfig(req)
    )
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => res.status(500).jsonp("Error getting project"));
});

/**
 * Get project image
 */
router.get(
  "/:user/:project/img/:img",
  auth.checkToken,
  function (req, res, next) {
    axios
      .get(
        projectsURL +
          `${req.params.user}/${req.params.project}/img/${req.params.img}`,
        getAxiosConfig(req)
      )
      .then((resp) => {
        res.status(200).send(resp.data);
      })
      .catch((err) => res.status(500).jsonp("Error getting project image"));
  }
);

/**
 * Get project images
 */
router.get("/:user/:project/imgs", auth.checkToken, function (req, res, next) {
  axios
    .get(
      projectsURL + `${req.params.user}/${req.params.project}/imgs`,
      getAxiosConfig(req)
    )
    .then((resp) => {
      res.status(200).send(resp.data);
    })
    .catch((err) => res.status(500).jsonp("Error getting project images"));
});

/**
 * Get project's processment result
 */
router.get(
  "/:user/:project/process",
  auth.checkProjectTokenOrUser,
  function (req, res, next) {
    axios
      .get(
        projectsURL + `${req.params.user}/${req.params.project}/process`,
        getAxiosConfig(req, { responseType: "arraybuffer" })
      )
      .then((resp) => res.status(200).send(resp.data))
      .catch((err) =>
        res.status(500).jsonp("Error getting processing results file")
      );
  }
);

/**
 * Get project's processment result (URL list)
 */
router.get(
  "/:user/:project/process/url",
  auth.checkProjectTokenOrUser,
  function (req, res, next) {
    axios
      .get(
        projectsURL + `${req.params.user}/${req.params.project}/process/url`,
        getAxiosConfig(req)
      )
      .then((resp) => {
        res.status(200).send(resp.data);
      })
      .catch((err) =>
        res.status(500).jsonp("Error getting processing results")
      );
  }
);



/**
 * Create new user's project
 */
router.post("/:user", auth.checkToken, function (req, res, next) {
  axios
    .post(projectsURL + `${req.params.user}`, req.body, getAxiosConfig(req))
    .then((resp) => res.status(201).jsonp(resp.data))
    .catch((err) => res.status(500).jsonp("Error creating new project"));
});

/**
 * Preview an image
 */
router.post(
  "/:user/:project/preview/:img",
  auth.checkProjectTokenOrUser,
  function (req, res, next) {
    axios
      .post(
        projectsURL +
          `${req.params.user}/${req.params.project}/preview/${req.params.img}`,
        req.body,
        getAxiosConfig(req)
      )
      .then((resp) => res.status(201).jsonp(resp.data))
      .catch((err) => {
        console.log(err);
        res.status(500).jsonp("Error requesting image preview");
      });
  }
);


/**
 * Add image to project
 */
router.post(
  "/:user/:project/img",
  auth.checkProjectTokenOrUser, 
  upload.single("image"),      
  function (req, res, next) {
    if (!req.file) return res.status(400).jsonp("No image file provided");

    
    const data = new FormData();
    data.append("image", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // 2. Encaminhar para o MS Projetos seguindo o padrão das Tools
    axios
      .post(
        projectsURL + `${req.params.user}/${req.params.project}/img`,
        data,
        // getAxiosConfig garante que o 'Authorization' e o 'x-project-token' são passados
        getAxiosConfig(req, { headers: data.getHeaders() }) 
      )
      .then((resp) => res.status(201).jsonp(resp.data))
      .catch((err) => {
        // Reporta o erro real vindo do Microserviço
        const statusCode = err.response?.status || 500;
        res.status(statusCode).jsonp(err.response?.data || "Error forwarding image");
      });
  }
);
/**
 * Add tool to project
 */
router.post(
  "/:user/:project/tool",
  auth.checkProjectTokenOrUser,
  function (req, res, next) {
    axios
      .post(
        projectsURL + `${req.params.user}/${req.params.project}/tool`,
        req.body,
        getAxiosConfig(req)
      )
      .then((resp) => res.status(201).jsonp(resp.data))
      .catch((err) => res.status(err?.status).jsonp(err?.response?.data));
  }
);

/**
 * Reorder tools
 */
router.post(
  "/:user/:project/reorder",
  auth.checkToken,
  function (req, res, next) {
    axios
      .post(
        projectsURL + `${req.params.user}/${req.params.project}/reorder`,
        req.body,
        getAxiosConfig(req)
      )
      .then((resp) => res.status(201).jsonp(resp.data))
      .catch((err) => res.status(500).jsonp("Error reordering tools"));
  }
);

/**
 * Process project
 */
router.post(
  "/:user/:project/process",
  auth.checkToken,
  function (req, res, next) {
    axios
      .post(
        projectsURL + `${req.params.user}/${req.params.project}/process`,
        req.body,
        getAxiosConfig(req)
      )
      .then((resp) => res.status(201).jsonp(resp.data))
      .catch((err) => res.status(err?.status).jsonp(err?.response?.data));
  }
);

/**
 * Cancel process
 */
router.post(
  "/:user/:project/process/cancel",
  auth.checkToken,
  function (req, res, next) {
    axios
      .post(
        projectsURL + `${req.params.user}/${req.params.project}/process/cancel`,
        req.body,
        getAxiosConfig(req)
      )
      .then((resp) => res.status(204).jsonp(resp.data))
      .catch((err) => res.status(err?.status).jsonp(err?.response?.data));
  }
);

/**
 * Update project
 */
router.put("/:user/:project", auth.checkToken, function (req, res, next) {
  axios
    .put(
      projectsURL + `${req.params.user}/${req.params.project}`,
      req.body,
      getAxiosConfig(req)
    )
    .then((_) => res.sendStatus(204))
    .catch((err) => res.status(500).jsonp("Error updating project details"));
});

/**
 * Update tool
 */
router.put(
  "/:user/:project/tool/:tool",
  auth.checkProjectTokenOrUser,
  function (req, res, next) {
    axios
      .put(
        projectsURL +
          `${req.params.user}/${req.params.project}/tool/${req.params.tool}`,
        req.body,
        getAxiosConfig(req)
      )
      .then((_) => res.sendStatus(204))
      .catch((err) => res.status(500).jsonp("Error updating tool params"));
  }
);

/**
 * Delete project
 */
router.delete("/:user/:project", auth.checkToken, function (req, res, next) {
  axios
    .delete(
      projectsURL + `${req.params.user}/${req.params.project}`,
      getAxiosConfig(req)
    )
    .then((_) => res.sendStatus(204))
    .catch((err) => res.status(500).jsonp("Error deleting project"));
});

/**
 * Delete image
 */
router.delete(
  "/:user/:project/img/:img",
  auth.checkToken,
  function (req, res, next) {
    axios
      .delete(
        projectsURL +
          `${req.params.user}/${req.params.project}/img/${req.params.img}`,
        getAxiosConfig(req)
      )
      .then((_) => res.sendStatus(204))
      .catch((err) =>
        res.status(500).jsonp("Error deleting image from project")
      );
  }
);

/**
 * Delete tool
 */
router.delete(
  "/:user/:project/tool/:tool",
  auth.checkProjectTokenOrUser,
  function (req, res, next) {
    axios
      .delete(
        projectsURL +
          `${req.params.user}/${req.params.project}/tool/${req.params.tool}`,
        getAxiosConfig(req)
      )
      .then((_) => res.sendStatus(204))
      .catch((err) =>
        res.status(500).jsonp("Error removing tool from project")
      );
  }
);

module.exports = router;
