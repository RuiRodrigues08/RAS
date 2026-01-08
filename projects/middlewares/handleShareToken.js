const ShareLink = require("../controllers/sharelink");

module.exports.handleShareToken = async (req, res, next) => {
  const shareToken = req.headers["x-project-token"];
  if (!shareToken) {
    console.log("Teste estou aqui e NAO DEVIA");
    req.projectOwner = req.params.user;
    return next();
  }

  try {
    const result = await ShareLink.validateLink(shareToken, req.params.project);

    if (!result) return res.status(404).jsonp("Share link expired");

    const isWriteMethod = ["POST", "PUT", "DELETE", "PATCH"].includes(
      req.method
    );
    const perm = result.shareLink.permission;

    if (isWriteMethod && perm !== "EDITOR") {
      return res.status(403).jsonp("Viewer cannot edit");
    }

    req.projectOwner = result.project.user_id;
    req.requestorId = req.params.user;

    next();
  } catch (err) {
    return res.status(500).jsonp("Error validating share token");
  }
};
