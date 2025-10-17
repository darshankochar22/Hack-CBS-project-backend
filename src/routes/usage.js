import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import UsageLog from "../models/UsageLog.js";
import Project from "../models/Project.js";
import ApiKey from "../models/ApiKey.js";

const router = express.Router();

// Get usage statistics for a project
router.get("/stats/:projectId", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { period = "30d", limit = 10 } = req.query;

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

    // Calculate date range based on period
    let startDate = new Date();
    switch (period) {
      case "1d":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get total calls in period
    const totalCalls = await UsageLog.countDocuments({
      projectId: new mongoose.Types.ObjectId(projectId),
      timestamp: { $gte: startDate },
    });

    // Get today's calls
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCalls = await UsageLog.countDocuments({
      projectId: new mongoose.Types.ObjectId(projectId),
      timestamp: { $gte: today },
    });

    // Get calls by endpoint (top endpoints)
    const topEndpoints = await UsageLog.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$endpoint",
          count: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" },
          errorCount: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
    ]);

    // Get error rate
    const errorCalls = await UsageLog.countDocuments({
      projectId: new mongoose.Types.ObjectId(projectId),
      statusCode: { $gte: 400 },
      timestamp: { $gte: startDate },
    });

    // Get calls by status code
    const statusCodeStats = await UsageLog.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$statusCode",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get average response time
    const avgResponseTime = await UsageLog.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
    ]);

    // Get recent activity (last 10 calls)
    const recentActivity = await UsageLog.find({
      projectId: new mongoose.Types.ObjectId(projectId),
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .select("endpoint method statusCode responseTime timestamp metadata.ip")
      .populate("apiKeyId", "name");

    res.json({
      message: "Usage statistics retrieved successfully",
      period,
      project: {
        id: project._id,
        name: project.name,
      },
      stats: {
        totalCalls,
        todayCalls,
        errorRate:
          totalCalls > 0 ? ((errorCalls / totalCalls) * 100).toFixed(2) : 0,
        avgResponseTime:
          avgResponseTime.length > 0
            ? Math.round(avgResponseTime[0].avgResponseTime)
            : 0,
        topEndpoints,
        statusCodeStats,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Get usage stats error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid project ID",
        message: "The provided project ID is not valid",
      });
    }
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve usage statistics",
    });
  }
});

// Get usage analytics with charts data
router.get("/analytics/:projectId", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { days = 30 } = req.query;

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

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get daily usage data for charts
    const dailyUsage = await UsageLog.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          },
          calls: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" },
          errors: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Get hourly usage for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hourlyUsage = await UsageLog.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          timestamp: { $gte: today },
        },
      },
      {
        $group: {
          _id: {
            hour: { $hour: "$timestamp" },
          },
          calls: { $sum: 1 },
        },
      },
      { $sort: { "_id.hour": 1 } },
    ]);

    // Get endpoint performance
    const endpointPerformance = await UsageLog.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$endpoint",
          calls: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" },
          minResponseTime: { $min: "$responseTime" },
          maxResponseTime: { $max: "$responseTime" },
          errors: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
        },
      },
      { $sort: { calls: -1 } },
      { $limit: 20 },
    ]);

    res.json({
      message: "Usage analytics retrieved successfully",
      period: `${days} days`,
      project: {
        id: project._id,
        name: project.name,
      },
      analytics: {
        dailyUsage,
        hourlyUsage,
        endpointPerformance,
      },
    });
  } catch (error) {
    console.error("Get usage analytics error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid project ID",
        message: "The provided project ID is not valid",
      });
    }
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve usage analytics",
    });
  }
});

// Get API key usage statistics
router.get("/keys/:keyId", authenticateToken, async (req, res) => {
  try {
    const { keyId } = req.params;
    const { period = "30d" } = req.query;

    // Find API key and verify ownership
    const apiKey = await ApiKey.findById(keyId).populate({
      path: "projectId",
      populate: {
        path: "owner",
        select: "_id",
      },
    });

    if (!apiKey) {
      return res.status(404).json({
        error: "API key not found",
        message: "The specified API key does not exist",
      });
    }

    // Verify user owns the project
    if (apiKey.projectId.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Access denied",
        message: "You don't have permission to view this API key's usage",
      });
    }

    // Calculate date range
    let startDate = new Date();
    switch (period) {
      case "1d":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get usage stats for this API key
    const stats = await UsageLog.aggregate([
      {
        $match: {
          apiKeyId: new mongoose.Types.ObjectId(keyId),
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" },
          errorCount: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
          lastUsed: { $max: "$timestamp" },
        },
      },
    ]);

    // Get endpoint breakdown for this key
    const endpointBreakdown = await UsageLog.aggregate([
      {
        $match: {
          apiKeyId: new mongoose.Types.ObjectId(keyId),
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$endpoint",
          calls: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
      { $sort: { calls: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      message: "API key usage statistics retrieved successfully",
      period,
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        project: apiKey.projectId.name,
      },
      stats:
        stats.length > 0
          ? {
              ...stats[0],
              errorRate:
                stats[0].totalCalls > 0
                  ? ((stats[0].errorCount / stats[0].totalCalls) * 100).toFixed(
                      2
                    )
                  : 0,
            }
          : {
              totalCalls: 0,
              avgResponseTime: 0,
              errorCount: 0,
              errorRate: 0,
              lastUsed: null,
            },
      endpointBreakdown,
    });
  } catch (error) {
    console.error("Get API key usage error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid API key ID",
        message: "The provided API key ID is not valid",
      });
    }
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve API key usage statistics",
    });
  }
});

export default router;
