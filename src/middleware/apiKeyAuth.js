// API Key validation middleware - No auth required, just API key + Project ID
export const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];
    const projectId = req.headers["x-project-id"];

    // Check if both API key and Project ID are provided
    if (!apiKey) {
      return res.status(401).json({
        error: "API key required",
        message: "Please provide x-api-key header",
      });
    }

    if (!projectId) {
      return res.status(401).json({
        error: "Project ID required",
        message: "Please provide x-project-id header",
      });
    }

    // Validate API key format (basic validation)
    if (!apiKey.startsWith("pk_live_") && !apiKey.startsWith("pk_test_")) {
      return res.status(401).json({
        error: "Invalid API key format",
        message: "API key must start with pk_live_ or pk_test_",
      });
    }

    // Validate Project ID format (basic validation)
    if (!projectId.match(/^[a-f0-9]{24}$/)) {
      return res.status(401).json({
        error: "Invalid Project ID format",
        message: "Project ID must be a valid MongoDB ObjectId",
      });
    }

    // Store in request for use in routes
    req.apiKey = apiKey;
    req.projectId = projectId;

    next();
  } catch (error) {
    console.error("API key validation error:", error);
    return res.status(500).json({
      error: "API key validation failed",
      message: "Internal server error",
    });
  }
};

// Optional API key validation (for public endpoints that can benefit from project context)
export const optionalApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];
    const projectId = req.headers["x-project-id"];

    if (apiKey && projectId) {
      // Basic validation
      if (apiKey.startsWith("pk_live_") || apiKey.startsWith("pk_test_")) {
        if (projectId.match(/^[a-f0-9]{24}$/)) {
          req.apiKey = apiKey;
          req.projectId = projectId;
        }
      }
    }

    next();
  } catch (error) {
    // For optional validation, continue even if validation fails
    next();
  }
};
