import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import projectRoutes from "./routes/projects.js";
import apiKeyRoutes from "./routes/apiKeys.js";
import usageRoutes from "./routes/usage.js";
import apiRoutes from "./routes/api.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003; // Different port from FastAPI

// Trust proxy for Vercel deployment
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());

// CORS must be BEFORE rate limiting so errors still include CORS headers
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://hexagon-eran.vercel.app",
      "https://hexagon-steel.vercel.app",
      "https://hexagon.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "X-API-Key"],
  })
);
app.options("*", cors());

// Rate limiting (after CORS so 429 responses still have ACAO)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
// After your cors() middleware, add:
app.options("*", cors());
// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL || "mongodb://localhost:27017/hexagon",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;

    if (!mongoUrl) {
      console.error("❌ MONGO_URL environment variable is not set");
      process.exit(1);
    }

    // Validate MongoDB URL format
    if (
      !mongoUrl.startsWith("mongodb://") &&
      !mongoUrl.startsWith("mongodb+srv://")
    ) {
      console.error("❌ Invalid MongoDB URL format:", mongoUrl);
      console.error("❌ URL must start with 'mongodb://' or 'mongodb+srv://'");
      process.exit(1);
    }

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Ensure DB is connected in serverless environments BEFORE routes
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB().catch(next);
  }
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/projects", projectRoutes);
app.use("/api-keys", apiKeyRoutes);
app.use("/usage", usageRoutes);

// Public API routes (require API key authentication)
app.use("/api", apiRoutes);

// API Key validation endpoint for NPM package
app.post("/api/validate-key", express.json(), async (req, res) => {
  try {
    const { projectId, apiKey } = req.body;
    const headerApiKey = req.headers["x-api-key"];
    const headerProjectId = req.headers["x-project-id"];

    // Use header values if body values are not provided
    const finalApiKey = apiKey || headerApiKey;
    const finalProjectId = projectId || headerProjectId;

    if (!finalApiKey || !finalProjectId) {
      return res.status(400).json({
        error: "Missing API key or Project ID",
        message: "Both API key and Project ID are required",
      });
    }

    // TODO: Validate against your database
    // For now, we'll do basic validation
    if (!finalApiKey.startsWith("pk_live_")) {
      return res.status(401).json({
        error: "Invalid API key format",
        message: "API key must start with 'pk_live_'",
      });
    }

    // Simulate project validation
    console.log(`🔑 Validating API key for project: ${finalProjectId}`);

    res.json({
      success: true,
      message: "API key and project ID validated successfully",
      project: {
        id: finalProjectId,
        name: `Project ${finalProjectId}`,
        status: "active",
      },
      apiKey: {
        id: finalApiKey.substring(0, 20) + "...",
        permissions: ["auth", "database", "storage"],
      },
    });
  } catch (error) {
    console.error("API key validation error:", error);
    res.status(500).json({ error: "Failed to validate API key" });
  }
});

// Usage tracking endpoint for NPM package
app.post("/api/usage/track", express.json(), async (req, res) => {
  try {
    const {
      packageVersion,
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp,
      projectId,
      apiKey,
      anonymousId,
      source,
      success,
      responseSize,
    } = req.body;

    console.log(
      `📊 Usage Track: ${method} ${endpoint} (${responseTime}ms) - ${statusCode} - Project: ${projectId}`
    );

    // Store usage data (you can save to database if needed)
    const usageData = {
      packageVersion,
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: new Date(timestamp),
      projectId,
      apiKey: apiKey.substring(0, 10) + "...", // Partial key for security
      anonymousId,
      source,
      success,
      responseSize,
      receivedAt: new Date(),
    };

    // For now, just log it. You can save to database later
    console.log("Usage data:", usageData);

    res.json({ success: true, message: "Usage tracked successfully" });
  } catch (error) {
    console.error("Usage tracking error:", error);
    res.status(500).json({ error: "Failed to track usage" });
  }
});

// Legacy telemetry endpoint for backward compatibility
app.post("/api/telemetry", express.json(), async (req, res) => {
  try {
    const {
      packageVersion,
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp,
      anonymousId,
      source,
    } = req.body;

    console.log(
      `📊 Telemetry: ${method} ${endpoint} (${responseTime}ms) - ${statusCode}`
    );

    // Store telemetry data (you can save to database if needed)
    const telemetryData = {
      packageVersion,
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: new Date(timestamp),
      anonymousId,
      source,
      receivedAt: new Date(),
    };

    // For now, just log it. You can save to database later
    console.log("Telemetry data:", telemetryData);

    res.json({ success: true, message: "Telemetry received" });
  } catch (error) {
    console.error("Telemetry error:", error);
    res.status(500).json({ error: "Failed to process telemetry" });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Hexagon Node.js Backend is running",
    version: "1.0.1",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// (moved DB ensure middleware above routes)

// Start server only when not running on Vercel serverless
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}`);
  });
};

if (!process.env.VERCEL) {
  startServer().catch(console.error);
}

export default app;
