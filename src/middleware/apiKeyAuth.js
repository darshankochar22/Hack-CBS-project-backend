import ApiKey from "../models/ApiKey.js";

/**
 * Middleware to authenticate API key requests
 * Looks for x-api-key header and validates the key
 */
export const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"] || req.headers["X-API-Key"];

    if (!apiKey) {
      return res.status(401).json({
        error: "API key required",
        message: "Please provide an API key in the x-api-key header",
      });
    }

    // Find and validate API key
    const keyDoc = await ApiKey.findOne({
      key: apiKey,
      isActive: true,
    }).populate("projectId");

    if (!keyDoc) {
      return res.status(401).json({
        error: "Invalid or inactive API key",
        message: "The provided API key is not valid or has been deactivated",
      });
    }

    // Check if project is still active (optional additional security)
    if (!keyDoc.projectId) {
      return res.status(401).json({
        error: "Associated project not found",
        message:
          "The API key is associated with a project that no longer exists",
      });
    }

    // Update last used timestamp
    keyDoc.lastUsed = new Date();
    await keyDoc.save();

    // Attach to request for use in subsequent middleware/routes
    req.apiKey = keyDoc;
    req.projectId = keyDoc.projectId._id;
    req.project = keyDoc.projectId;

    next();
  } catch (error) {
    console.error("API key authentication error:", error);
    res.status(500).json({
      error: "Authentication error",
      message: "An error occurred while validating your API key",
    });
  }
};

/**
 * Middleware to optionally authenticate API key requests
 * Allows testing without API key but validates when provided
 */
export const optionalApiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"] || req.headers["X-API-Key"];

    // If no API key provided, continue without authentication (for testing)
    if (!apiKey) {
      console.log("No API key provided - allowing access for testing");
      return next();
    }

    // If API key is provided, validate it
    const keyDoc = await ApiKey.findOne({
      key: apiKey,
      isActive: true,
    }).populate("projectId");

    if (!keyDoc) {
      return res.status(401).json({
        error: "Invalid or inactive API key",
        message: "The provided API key is not valid or has been deactivated",
      });
    }

    // Check if project is still active (optional additional security)
    if (!keyDoc.projectId) {
      return res.status(401).json({
        error: "Associated project not found",
        message:
          "The API key is associated with a project that no longer exists",
      });
    }

    // Update last used timestamp
    keyDoc.lastUsed = new Date();
    await keyDoc.save();

    // Attach to request for use in subsequent middleware/routes
    req.apiKey = keyDoc;
    req.projectId = keyDoc.projectId._id;
    req.project = keyDoc.projectId;

    next();
  } catch (error) {
    console.error("Optional API key authentication error:", error);
    res.status(500).json({
      error: "Authentication error",
      message: "An error occurred while validating your API key",
    });
  }
};

/**
 * Middleware to check API key permissions
 * Should be used after apiKeyAuth middleware
 */
export const checkApiKeyPermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    try {
      // If no API key provided, allow access for testing (skip permission checks)
      if (!req.apiKey) {
        console.log(
          "No API key provided - skipping permission checks for testing"
        );
        return next();
      }

      // If no specific permissions required, allow access
      if (!requiredPermissions || requiredPermissions.length === 0) {
        return next();
      }

      // Check if API key has all required permissions
      const hasAllPermissions = requiredPermissions.every((permission) =>
        req.apiKey.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          error: "Insufficient permissions",
          message: `This API key requires the following permissions: ${requiredPermissions.join(
            ", "
          )}`,
          required: requiredPermissions,
          current: req.apiKey.permissions,
        });
      }

      next();
    } catch (error) {
      console.error("API key permission check error:", error);
      res.status(500).json({
        error: "Permission check error",
        message: "An error occurred while checking API key permissions",
      });
    }
  };
};
