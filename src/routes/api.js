import express from "express";
import { body, validationResult } from "express-validator";
import { validateApiKey, optionalApiKey } from "../middleware/apiKeyAuth.js";

const router = express.Router();

// Apply API key validation to all routes
router.use(validateApiKey);

// Auth API Routes
router.post(
  "/auth/signup",
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

// Database API Routes
router.get("/db/query", async (req, res) => {
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
});

router.post(
  "/db/insert",
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

// Storage API Routes
router.post(
  "/storage/upload",
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

// Analytics API Routes
router.get("/analytics/usage", async (req, res) => {
  try {
    res.json({
      message: "Usage statistics retrieved successfully",
      stats: {
        totalRequests: 150,
        successfulRequests: 145,
        failedRequests: 5,
        averageResponseTime: 250,
        last24Hours: {
          requests: 25,
          errors: 1,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics usage error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/performance", async (req, res) => {
  try {
    res.json({
      message: "Performance metrics retrieved successfully",
      metrics: {
        uptime: "99.9%",
        averageResponseTime: 250,
        p95ResponseTime: 500,
        p99ResponseTime: 1000,
        requestsPerSecond: 10,
        memoryUsage: "45%",
        cpuUsage: "30%",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics performance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    res.json({
      message: "Project analytics retrieved successfully",
      projectId,
      analytics: {
        totalApiCalls: 100,
        authCalls: 30,
        databaseCalls: 50,
        storageCalls: 20,
        lastActivity: new Date().toISOString(),
        monthlyUsage: {
          requests: 1000,
          storage: "50MB",
          bandwidth: "200MB",
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Project analytics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Storage API Routes
router.get("/storage/list", async (req, res) => {
  try {
    res.json({
      message: "Files listed successfully",
      files: [
        {
          id: "file_1",
          filename: "document.pdf",
          size: 1024000,
          uploadedAt: new Date().toISOString(),
          url: "https://storage.example.com/files/file_1",
        },
        {
          id: "file_2",
          filename: "image.jpg",
          size: 512000,
          uploadedAt: new Date().toISOString(),
          url: "https://storage.example.com/files/file_2",
        },
      ],
      count: 2,
    });
  } catch (error) {
    console.error("Storage list error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/storage/download/:filename", async (req, res) => {
  try {
    const { filename } = req.params;

    res.json({
      message: "File download initiated successfully",
      file: {
        filename,
        url: `https://storage.example.com/files/${filename}`,
        downloadUrl: `https://storage.example.com/download/${filename}`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      },
    });
  } catch (error) {
    console.error("Storage download error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API Information endpoint (no auth required for info)
router.get("/info", optionalApiKey, async (req, res) => {
  const response = {
    message: "BAAS API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  };

  // Add project and API key info if available
  if (req.projectId && req.apiKey) {
    response.project = {
      id: req.projectId,
      name: `Project ${req.projectId}`,
    };
    response.apiKey = {
      id: req.apiKey.substring(0, 20) + "...",
      name: "API Key",
      permissions: ["auth", "database", "storage"],
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
