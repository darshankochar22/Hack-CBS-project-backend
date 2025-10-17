import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: "API Key",
      trim: true,
      maxlength: 100,
    },
    permissions: [
      {
        type: String,
        enum: ["auth", "database", "storage"],
        default: ["auth", "database"],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
apiKeySchema.index({ projectId: 1, isActive: 1 });
apiKeySchema.index({ key: 1 });
apiKeySchema.index({ lastUsed: -1 });

// Remove sensitive data when converting to JSON
apiKeySchema.methods.toJSON = function () {
  const apiKeyObject = this.toObject();
  // Don't expose the full key in JSON responses for security
  if (apiKeyObject.key) {
    apiKeyObject.key =
      apiKeyObject.key.substring(0, 8) +
      "..." +
      apiKeyObject.key.substring(apiKeyObject.key.length - 4);
  }
  return apiKeyObject;
};

// Method to get full key (for internal use only)
apiKeySchema.methods.getFullKey = function () {
  return this.key;
};

const ApiKey = mongoose.model("ApiKey", apiKeySchema);

export default ApiKey;
