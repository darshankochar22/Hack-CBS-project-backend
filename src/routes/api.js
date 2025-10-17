import express from "express";
import { body, validationResult } from "express-validator";
import {
  apiKeyAuth,
  optionalApiKeyAuth,
  checkApiKeyPermissions,
} from "../middleware/apiKeyAuth.js";
import { trackUsage } from "../middleware/trackUsage.js";

const router = express.Router();

// Apply optional API key authentication and usage tracking to all routes
router.use(optionalApiKeyAuth, trackUsage);

// Example Auth API Routes
router.post(
  "/auth/signup",
  checkApiKeyPermissions(["auth"]),
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Simulate user creation
      const userId = `user_${Date.now()}`;

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: userId,
          email,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/auth/login",
  checkApiKeyPermissions(["auth"]),
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Simulate user authentication
      const userId = `user_${Date.now()}`;
      const token = `jwt_token_${Date.now()}`;

      res.json({
        message: "Login successful",
        user: {
          id: userId,
          email,
        },
        token,
        expiresIn: "7d",
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Example Database API Routes
router.get(
  "/db/query",
  checkApiKeyPermissions(["database"]),
  async (req, res) => {
    try {
      const { table, limit = 10 } = req.query;

      // Simulate database query
      const results = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
        id: i + 1,
        name: `Record ${i + 1}`,
        createdAt: new Date().toISOString(),
      }));

      res.json({
        message: "Query executed successfully",
        table: table || "default",
        results,
        count: results.length,
      });
    } catch (error) {
      console.error("Database query error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/db/insert",
  checkApiKeyPermissions(["database"]),
  [body("data").isObject().withMessage("Data object is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { data } = req.body;

      // Simulate database insert
      const insertedId = `record_${Date.now()}`;

      res.status(201).json({
        message: "Record inserted successfully",
        id: insertedId,
        data,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Database insert error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Example Storage API Routes
router.post(
  "/storage/upload",
  checkApiKeyPermissions(["storage"]),
  [
    body("filename").notEmpty().withMessage("Filename is required"),
    body("content").notEmpty().withMessage("File content is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { filename, content } = req.body;

      // Simulate file upload
      const fileId = `file_${Date.now()}`;
      const fileUrl = `https://storage.example.com/files/${fileId}`;

      res.status(201).json({
        message: "File uploaded successfully",
        file: {
          id: fileId,
          filename,
          url: fileUrl,
          size: content.length,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// API Information endpoint
router.get("/info", async (req, res) => {
  const response = {
    message: "BAAS API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  };

  // Add project and API key info if available
  if (req.project && req.apiKey) {
    response.project = {
      id: req.project._id,
      name: req.project.name,
    };
    response.apiKey = {
      id: req.apiKey._id,
      name: req.apiKey.name,
      permissions: req.apiKey.permissions,
    };
  } else {
    response.note = "Testing mode - no API key provided";
    response.availableEndpoints = [
      "POST /api/auth/signup - Create user account",
      "POST /api/auth/login - Authenticate user",
      "GET /api/db/query - Query database records",
      "POST /api/db/insert - Insert new record",
      "POST /api/storage/upload - Upload file",
      "GET /api/info - API information",
    ];
  }

  res.json(response);
});

export default router;
