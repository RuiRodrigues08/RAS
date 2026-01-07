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
    throw new Error('Project not found');
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
  const shareLink = await ShareLink.findOne({ token: token }).exec();
  
  if (!shareLink) {
    return null;
  }

  if(shareLink.projectId.toString() !== projectReal){
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

