const mongoose = require("mongoose");

const CloudDetailSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["AWS_S3", "CLOUDINARY", "GCP"],
      required: true
    },

    bucketName: { type: String },

    fileUrl: { type: String, required: true },

    fileKey: { type: String },

    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CloudDetail ||
  mongoose.model("CloudDetail", CloudDetailSchema);
