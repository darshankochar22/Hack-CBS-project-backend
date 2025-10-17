import express from "express";
import { body, validationResult } from "express-validator";
import { authenticateToken } from "../middleware/auth.js";
import Project from "../models/Project.js";

const router = express.Router();

// Create a new project
router.post(
  "/",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Project name is required")
      .isLength({ min: 1, max: 200 })
      .withMessage("Name must be between 1 and 200 characters"),
    body("startDate")
      .notEmpty()
      .withMessage("Start date is required")
      .isISO8601()
      .withMessage("Start date must be a valid date"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description must not exceed 1000 characters"),
    // Optional setup flags
    body("addAuth").optional().isBoolean(),
    body("connectDatabase").optional().isBoolean(),
    body("manageApis").optional().isBoolean(),
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

      const {
        name,
        description = "",
        startDate,
        addAuth = false,
        connectDatabase = false,
        manageApis = false,
      } = req.body;

      const project = new Project({
        name,
        description,
        startDate: new Date(startDate),
        owner: req.user._id,
        addAuth: Boolean(addAuth),
        connectDatabase: Boolean(connectDatabase),
        manageApis: Boolean(manageApis),
      });

      await project.save();

      res.status(201).json({
        message: "Project created successfully",
        project,
      });
    } catch (error) {
      console.error("Create project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get all projects for the authenticated user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .select("-__v");

    res.json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a single project by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select("-__v");

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if user owns the project
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a project
router.put(
  "/:id",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Name must be between 1 and 200 characters"),
    body("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid date"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description must not exceed 1000 characters"),
    body("addAuth").optional().isBoolean(),
    body("connectDatabase").optional().isBoolean(),
    body("manageApis").optional().isBoolean(),
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

      const project = await Project.findById(req.params.id);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check if user owns the project
      if (project.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Update fields
      if (req.body.name !== undefined) {
        project.name = req.body.name;
      }
      if (req.body.description !== undefined) {
        project.description = req.body.description;
      }
      if (req.body.startDate !== undefined) {
        project.startDate = new Date(req.body.startDate);
      }
      if (req.body.addAuth !== undefined) {
        project.addAuth = Boolean(req.body.addAuth);
      }
      if (req.body.connectDatabase !== undefined) {
        project.connectDatabase = Boolean(req.body.connectDatabase);
      }
      if (req.body.manageApis !== undefined) {
        project.manageApis = Boolean(req.body.manageApis);
      }

      await project.save();

      res.json({
        message: "Project updated successfully",
        project,
      });
    } catch (error) {
      console.error("Update project error:", error);
      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Delete a project
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if user owns the project
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid project ID" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
