var express = require("express");
var router = express.Router();
const path = require("path");

const Project = require("../controllers/project");
const ShareLink = require("../controllers/sharelink");

const { get_image_host } = require("../utils/minio");

router.post("/:user/:project/share", (req, res, next) => {
  const { permission } = req.body;
  
  // Validate permission
  if (!permission || !['VIEWER', 'EDITOR'].includes(permission)) {
    return res.status(400).jsonp('Invalid permission. Must be VIEWER or EDITOR');
  }

  
  Project.getOne(req.params.user, req.params.project)
    .then((project) => {
      if (!project) {
        return res.status(404).jsonp('Project not found');
      }

      // Generate share link 
      ShareLink.generateLink(req.params.project, permission)
        .then((shareLink) => {
          res.status(201).jsonp({
            token: shareLink.token,
            permission: shareLink.permission,
            createdAt: shareLink.createdAt,
            url: `/shared/${shareLink.token}`,
          });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).jsonp('Error creating share link');
        });
    })
    .catch((_) => res.status(500).jsonp('Error validating project'));
});

// Get project by share token
router.get("/share/:token", (req, res, next) => {
  ShareLink.validateLink(req.params.token)
    .then(async (result) => {
      if (!result) {
        return res.status(404).jsonp('Share link not found or expired');
      }

      const { shareLink, project } = result;

      const response = {
        _id: project._id,
        user_id: project.user_id,
        name: project.name,
        tools: project.tools,
        imgs: [],
        permission: shareLink.permission,
      };

      // Get image URLs
      for (let img of project.imgs) {
        try {
          const resp = await get_image_host(
            project.user_id,
            project._id,
            "src",
            img.og_img_key
          );
          const url = resp.data.url;

          response["imgs"].push({
            _id: img._id,
            name: path.basename(img.og_uri),
            url: url,
          });
        } catch (err) {
          console.error('Error getting image URL:', err.message);
          res.status(404).jsonp(`Error acquiring image's url`);
          return;
        }
      }

      res.status(200).jsonp(response);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).jsonp('Error validating share link');
    });
});

module.exports = router;
