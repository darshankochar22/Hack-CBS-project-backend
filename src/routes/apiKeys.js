import express from "express";
import { body, validationResult } from "express-validator";
import { authenticateToken } from "../middleware/auth.js";
import {
  generateProductionApiKey,
  maskApiKey,
} from "../utils/apiKeyGenerator.js";
import ApiKey from "../models/ApiKey.js";
import Project from "../models/Project.js";

const router = express.Router();

// Validation middleware
const validateApiKeyCreation = [
  body("projectId").isMongoId().withMessage("Valid project ID is required"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array"),
  body("permissions.*")
    .optional()
    .isIn(["auth", "database", "storage"])
    .withMessage("Each permission must be one of: auth, database, storage"),
];

// Generate API key
router.post(
  "/generate",
  validateApiKeyCreation,
  authenticateToken,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { projectId, name, description, permissions } = req.body;

      // Verify project belongs to user
      const project = await Project.findOne({
        _id: projectId,
        owner: req.user._id,
      });

      if (!project) {
        return res.status(404).json({
          error: "Project not found",
          message:
            "The specified project does not exist or you don't have access to it",
        });
      }

      // Generate secure API key
      const key = generateProductionApiKey();

      // Create API key
      const apiKey = await ApiKey.create({
        projectId,
        key,
        name: name || "Production Key",
        description: description || "",
        permissions: permissions || ["auth", "database"],
        isActive: true,
      });

      // Return the full key only once during creation
      const responseData = apiKey.toJSON();
      responseData.key = apiKey.getFullKey(); // Override the masked key with full key

      res.status(201).json({
        message: "API key generated successfully",
        apiKey: responseData,
        warning:
          "Save this API key securely. You won't be able to see it again.",
      });
    } catch (error) {
      console.error("Generate API key error:", error);
      if (error.code === 11000) {
        return res.status(409).json({
          error: "Duplicate API key",
          message:
            "A key with this identifier already exists. Please try again.",
        });
      }
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to generate API key",
      });
    }
  }
);

// List API keys for a project
router.get("/project/:projectId", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project belongs to user
    const project = await Project.findOne({
      _id: projectId,
      owner: req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        error: "Project not found",
        message:
          "The specified project does not exist or you don't have access to it",
      });
    }

    const apiKeys = await ApiKey.find({ projectId })
      .select("-key") // Don't expose full keys in list
      .sort({ createdAt: -1 });

    res.json({
      message: "API keys retrieved successfully",
      apiKeys,
      project: {
        id: project._id,
        name: project.name,
      },
    });
  } catch (error) {
    console.error("List API keys error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve API keys",
    });
  }
});

// Get single API key details (without full key)
router.get("/:keyId", authenticateToken, async (req, res) => {
  try {
    const { keyId } = req.params;

    const apiKey = await ApiKey.findById(keyId).populate(
      "projectId",
      "name owner"
    );

    if (!apiKey) {
      return res.status(404).json({
        error: "API key not found",
        message: "The specified API key does not exist",
      });
    }

    // Verify user owns the project
    if (apiKey.projectId.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Access denied",
        message: "You don't have permission to view this API key",
      });
    }

    res.json({
      message: "API key retrieved successfully",
      apiKey: apiKey.toJSON(), // This will mask the key
    });
  } catch (error) {
    console.error("Get API key error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid API key ID",
        message: "The provided API key ID is not valid",
      });
    }
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve API key",
    });
  }
});

// Update API key
router.put(
  "/:keyId",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must not exceed 500 characters"),
    body("permissions")
      .optional()
      .isArray()
      .withMessage("Permissions must be an array"),
    body("permissions.*")
      .optional()
      .isIn(["auth", "database", "storage"])
      .withMessage("Each permission must be one of: auth, database, storage"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ],
  authenticateToken,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { keyId } = req.params;
      const { name, description, permissions, isActive } = req.body;

      const apiKey = await ApiKey.findById(keyId).populate(
        "projectId",
        "owner"
      );

      if (!apiKey) {
        return res.status(404).json({
          error: "API key not found",
          message: "The specified API key does not exist",
        });
      }

      // Verify user owns the project
      if (apiKey.projectId.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: "Access denied",
          message: "You don't have permission to modify this API key",
        });
      }

      // Update fields
      if (name !== undefined) apiKey.name = name;
      if (description !== undefined) apiKey.description = description;
      if (permissions !== undefined) apiKey.permissions = permissions;
      if (isActive !== undefined) apiKey.isActive = isActive;

      await apiKey.save();

      res.json({
        message: "API key updated successfully",
        apiKey: apiKey.toJSON(),
      });
    } catch (error) {
      console.error("Update API key error:", error);
      if (error.name === "CastError") {
        return res.status(400).json({
          error: "Invalid API key ID",
          message: "The provided API key ID is not valid",
        });
      }
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update API key",
      });
    }
  }
);

// Delete API key
router.delete("/:keyId", authenticateToken, async (req, res) => {
  try {
    const { keyId } = req.params;

    const apiKey = await ApiKey.findById(keyId).populate("projectId", "owner");

    if (!apiKey) {
      return res.status(404).json({
        error: "API key not found",
        message: "The specified API key does not exist",
      });
    }

    // Verify user owns the project
    if (apiKey.projectId.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Access denied",
        message: "You don't have permission to delete this API key",
      });
    }

    await ApiKey.findByIdAndDelete(keyId);

    res.json({
      message: "API key deleted successfully",
    });
  } catch (error) {
    console.error("Delete API key error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid API key ID",
        message: "The provided API key ID is not valid",
      });
    }
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete API key",
    });
  }
});

export default router;
