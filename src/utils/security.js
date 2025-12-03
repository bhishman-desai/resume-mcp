const config = require('../config');

/**
 * Validates API key
 */
function validateApiKey(providedKey) {
  // Require a non-empty API key to be configured
  if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
    // If no valid API key is configured, reject all requests
    return false;
  }
  
  // Require a non-empty provided key
  if (!providedKey || typeof providedKey !== 'string' || providedKey.trim().length === 0) {
    return false;
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

