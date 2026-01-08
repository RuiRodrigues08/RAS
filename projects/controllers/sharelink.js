const ShareLink = require("../models/sharelink");
const Project = require("../models/project");
const { generateRandomToken } = require("../utils/token");

/**
 * Generate a share link for a project
 * @param {string} projectId - The project ID
 * @param {string} permission - Permission level ('VIEWER' or 'EDITOR')
 * @returns {Promise<Object>} - The created share link with token
 */
module.exports.generateLink = async (projectId, permission) => {
  // Verify project exists
  const project = await Project.findOne({ _id: projectId }).exec();
  if (!project) {
    throw new Error("Project not found");
  }

  // Generate unique token
  let token = generateRandomToken();
  let exists = await ShareLink.findOne({ token: token }).exec();

  // Ensure token is unique
  while (exists) {
    token = generateRandomToken();
    exists = await ShareLink.findOne({ token: token }).exec();
  }

  // Create share link
  const shareLink = {
    token: token,
    projectId: projectId,
    permission: permission,
    deleted: false,
  };

  const created = await ShareLink.create(shareLink);
  return created;
};

/**
 * Validate a share link token
 * @param {string} token - The share link token
 * @param {string} projectReal - The project ID to validate
 * @returns {Promise<Object|null>} - The share link data with project info, or null if invalid
 */
module.exports.validateLink = async (token, projectReal) => {
  const shareLink = await ShareLink.findOne({ token: token, deleted: false }).exec();

  if (!shareLink) {
    return null;
  }

  if (shareLink.projectId.toString() !== projectReal) {
    return null;
  }
  const project = await Project.findOne({ _id: shareLink.projectId }).exec();

  if (!project) {
    return null;
  }

  return {
    shareLink: {
      token: shareLink.token,
      permission: shareLink.permission,
      createdAt: shareLink.createdAt,
    },
    project: project,
  };
};

module.exports.getAllUserLinks = async (uid) => {
  const projects = await Project.find().where({ user_id: uid }).exec();

  if (projects.length === 0) {
    return [];
  }

  const links = await ShareLink.find()
    .where({ projectId: { $in: projects.map((p) => p._id) }, deleted: false })
    .exec();

  if (links.length === 0) {
    return [];
  }

  const map = links.map((l) => {
    return {
      link: l,
      project: projects.find((p) => p._id.equals(l.projectId)),
    };
  });

  return map;
};

module.exports.editPermission = async (token, permission, user) => {
  try {
    const shareLink = await ShareLink.findOne({ token: token, deleted: false }).exec();

    if (!shareLink) {
      return null;
    }

    const project = await Project.findOne({ _id: shareLink.projectId }).exec();

    if (!project) {
      return null;
    }

    if (project.user_id.toString() !== user) {
      const error = new Error(
        "You don't have permission to edit this share link"
      );
      error.status = 403;
      throw error;
    }

    if (shareLink.permission === permission) {
      return { modifiedCount: 0 };
    }

    return await ShareLink.updateOne(
      { _id: shareLink._id },
      { $set: { permission: permission } }
    ).exec();
  } catch (err) {
    throw err;
  }
};

/**
 * Revoke a share link token
 * @param {string} token - The share link token
 * @returns {Promise<Object|null>} - The share link data with project info, or null if invalid
 */
module.exports.revokeLink = async (token, userId) => {
  try {
    const shareLink = await ShareLink.findOne({ token: token }).exec();

    if (!shareLink) {
      return null;
    }

    const project = await Project.findOne({ _id: shareLink.projectId }).exec();

    if (!project) {
      return null;
    }

    if (project.user_id.toString() !== userId) {
      const error = new Error(
        "You don't have permission to revoke this share link"
      );
      error.status = 403;
      throw error;
    }

    return await ShareLink.updateOne(
      { _id: shareLink._id },
      { $set: { deleted: true, deletedAt: new Date() } }
    ).exec();
  } catch (err) {
    throw err;
  }
};
