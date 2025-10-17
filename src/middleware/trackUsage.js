import UsageLog from "../models/UsageLog.js";

/**
 * Middleware to track API usage
 * Should be used after apiKeyAuth middleware
 * Logs API calls asynchronously without blocking the response
 */
export const trackUsage = (req, res, next) => {
  const startTime = Date.now();

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to log after response is sent
  res.end = function (...args) {
    const responseTime = Date.now() - startTime;

    // Only log if we have API key information (from apiKeyAuth middleware)
    if (req.apiKey && req.projectId) {
      // Log usage asynchronously (don't block response)
      UsageLog.create({
        apiKeyId: req.apiKey._id,
        projectId: req.projectId,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime: responseTime,
        timestamp: new Date(),
        metadata: {
          userAgent: req.headers["user-agent"] || "",
          ip:
            req.ip ||
            req.connection?.remoteAddress ||
            req.headers["x-forwarded-for"] ||
            "",
          errorMessage: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null,
          requestSize: req.get("content-length")
            ? parseInt(req.get("content-length"))
            : 0,
          responseSize: res.get("content-length")
            ? parseInt(res.get("content-length"))
            : 0,
        },
      }).catch((err) => {
        // Log error but don't fail the request
        console.error("Usage logging error:", err);
      });
    }

    // Call the original end function
    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Middleware to track usage with custom metadata
 * Allows passing additional metadata for tracking
 */
export const trackUsageWithMetadata = (customMetadata = {}) => {
  return (req, res, next) => {
    const startTime = Date.now();

    // Store custom metadata on request for later use
    req.trackingMetadata = customMetadata;

    const originalEnd = res.end;

    res.end = function (...args) {
      const responseTime = Date.now() - startTime;

      if (req.apiKey && req.projectId) {
        UsageLog.create({
          apiKeyId: req.apiKey._id,
          projectId: req.projectId,
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime: responseTime,
          timestamp: new Date(),
          metadata: {
            userAgent: req.headers["user-agent"] || "",
            ip:
              req.ip ||
              req.connection?.remoteAddress ||
              req.headers["x-forwarded-for"] ||
              "",
            errorMessage:
              res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null,
            requestSize: req.get("content-length")
              ? parseInt(req.get("content-length"))
              : 0,
            responseSize: res.get("content-length")
              ? parseInt(res.get("content-length"))
              : 0,
            ...req.trackingMetadata, // Include custom metadata
            ...customMetadata, // Include provided metadata
          },
        }).catch((err) => {
          console.error("Usage logging error:", err);
        });
      }

      originalEnd.apply(res, args);
    };

    next();
  };
};
