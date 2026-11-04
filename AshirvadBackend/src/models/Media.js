const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    originalName: {
      type: String,
      default: "",
      trim: true,
    },
    contentType: {
      type: String,
      required: true,
      default: "image/jpeg",
    },
    folder: {
      type: String,
      default: "general",
      index: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Media", mediaSchema);
