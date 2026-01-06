var express = require("express");
var router = express.Router();

const axios = require("axios");

const https = require("https");
const fs = require("fs");

const auth = require("../auth/auth");

const key = fs.readFileSync(__dirname + "/../certs/selfsigned.key");
const cert = fs.readFileSync(__dirname + "/../certs/selfsigned.crt");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // (NOTE: this will disable client verification)
  cert: cert,
  key: key,
});

const projectsURL = "https://projects:9001/";

/**
 * Create a share link for a project
 * @body { "permission": "VIEWER" | "EDITOR" }
 * @returns Share link data with token and URL
 */
router.post(
  "/:user/:project/share",
  auth.checkToken,
  function (req, res, next) {
    axios
      .post(
        projectsURL + `${req.params.user}/${req.params.project}/share`,
        req.body,
        { httpsAgent: httpsAgent }
      )
      .then((resp) => res.status(201).jsonp(resp.data))
      .catch((err) => res.status(500).jsonp("Error creating share link"));
  }
);

/**
 * Get project by share token (no authentication required)
 * @body Empty
 * @returns Project data with permission level
 */
router.get("/share/:token/:project", function (req, res, next) {
  axios
    .get(projectsURL + `share/${req.params.token}/${req.params.project}`,{
      httpsAgent: httpsAgent,
    })
    .then((resp) => res.status(200).jsonp(resp.data))
    .catch((err) => res.status(500).jsonp("Error getting shared project"));
});

module.exports = router;
