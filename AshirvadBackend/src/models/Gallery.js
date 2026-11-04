const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    mediaType: {
      type: String,
      enum: ["image", "video", "pdf"],
      required: true,
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      default: "",
      trim: true,
    },
    fileName: {
      type: String,
      default: "",
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

gallerySchema.index({ displayOrder: 1, createdAt: -1 });
gallerySchema.index({ mediaType: 1, isActive: 1 });

module.exports = mongoose.model("Gallery", gallerySchema);
