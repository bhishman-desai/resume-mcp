const config = require('../config');

/**
 * Validates API key
 */
function validateApiKey(providedKey) {
  if (!config.apiKey) {
    // If no API key is configured, allow all requests (development mode)
    return true;
  }
  return providedKey === config.apiKey;
}

/**
 * Sanitizes filename to prevent path traversal attacks
 */
function sanitizeFilename(filename) {
  // Remove any path separators and dangerous characters
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '');
}

module.exports = {
  validateApiKey,
  sanitizeFilename,
};

