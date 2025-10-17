import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    startDate: {
      type: Date,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Setup options
    addAuth: {
      type: Boolean,
      default: false,
    },
    connectDatabase: {
      type: Boolean,
      default: false,
    },
    manageApis: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
projectSchema.index({ owner: 1, createdAt: -1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;
