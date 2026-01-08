const crypto = require('crypto');

/**
 * Generates a random secure token
 * @param {number} length - Length of the token (default: 32)
 * @returns {string} - Random token
 */
function generateRandomToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  generateRandomToken,
};