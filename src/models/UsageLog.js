import mongoose from "mongoose";

const usageLogSchema = new mongoose.Schema(
  {
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
    },
    method: {
      type: String,
      required: true,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    },
    statusCode: {
      type: Number,
      required: true,
    },
    responseTime: {
      type: Number,
      required: true, // in milliseconds
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      userAgent: {
        type: String,
        default: "",
      },
      ip: {
        type: String,
        default: "",
      },
      errorMessage: {
        type: String,
        default: null,
      },
      requestSize: {
        type: Number,
        default: 0,
      },
      responseSize: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: false, // We use our own timestamp field
  }
);

// Indexes for fast queries
usageLogSchema.index({ projectId: 1, timestamp: -1 });
usageLogSchema.index({ apiKeyId: 1, timestamp: -1 });
usageLogSchema.index({ endpoint: 1, timestamp: -1 });
usageLogSchema.index({ statusCode: 1, timestamp: -1 });
usageLogSchema.index({ timestamp: -1 });

// Compound indexes for common queries
usageLogSchema.index({ projectId: 1, endpoint: 1, timestamp: -1 });
usageLogSchema.index({ projectId: 1, statusCode: 1, timestamp: -1 });

// TTL index to automatically delete logs older than 90 days
usageLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

const UsageLog = mongoose.model("UsageLog", usageLogSchema);

export default UsageLog;
