import crypto from "crypto";

/**
 * Generate a secure API key with prefix
 * @param {string} prefix - The prefix for the API key (e.g., 'pk_live', 'pk_test')
 * @param {number} length - The length of the random part in bytes (default: 32)
 * @returns {string} The generated API key
 */
export const generateApiKey = (prefix = "pk_live", length = 32) => {
  const keyBytes = crypto.randomBytes(length);
  return `${prefix}_${keyBytes.toString("hex")}`;
};

/**
 * Generate a test API key
 * @param {number} length - The length of the random part in bytes (default: 32)
 * @returns {string} The generated test API key
 */
export const generateTestApiKey = (length = 32) => {
  return generateApiKey("pk_test", length);
};

/**
 * Generate a production API key
 * @param {number} length - The length of the random part in bytes (default: 32)
 * @returns {string} The generated production API key
 */
export const generateProductionApiKey = (length = 32) => {
  return generateApiKey("pk_live", length);
};

/**
 * Validate API key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if the API key format is valid
 */
export const isValidApiKeyFormat = (apiKey) => {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }

  // Check if it starts with pk_ and has the correct format
  const apiKeyPattern = /^pk_(live|test)_[a-f0-9]{64}$/;
  return apiKeyPattern.test(apiKey);
};

/**
 * Extract API key prefix
 * @param {string} apiKey - The API key
 * @returns {string|null} The prefix (live/test) or null if invalid
 */
export const getApiKeyPrefix = (apiKey) => {
  if (!isValidApiKeyFormat(apiKey)) {
    return null;
  }

  const match = apiKey.match(/^pk_(live|test)_/);
  return match ? match[1] : null;
};

/**
 * Mask API key for display purposes
 * @param {string} apiKey - The full API key
 * @returns {string} The masked API key (shows first 8 and last 4 characters)
 */
export const maskApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 12) {
    return "***";
  }

  return apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
};
