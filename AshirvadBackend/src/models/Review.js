const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    // Metric / Counter / Review value (e.g. "9,000+", "45", "70 lakh+", "2004", "4.5 lakh")
    value: {
      type: String,
      required: [true, "Value/Number is required (e.g. 9,000+, 45, 70 lakh+)"],
      trim: true,
      maxlength: 100,
    },
    // Metric / Review label / title (e.g. "institutions served", "school groups", "classrooms")
    label: {
      type: String,
      required: [true, "Label/Title is required (e.g. institutions served)"],
      trim: true,
      maxlength: 200,
    },
    // Optional subtitle / full description / review text
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    // Optional client / reviewer name
    clientName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    // Optional designation / company / role
    designation: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    // Optional star rating (1-5)
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    // Icon name or svg representation
    icon: {
      type: String,
      default: "",
      trim: true,
    },
    // Image or avatar if provided
    image: {
      type: String,
      default: "",
      trim: true,
    },
    // Order of display in cards/sections
    displayOrder: {
      type: Number,
      default: 0,
    },
    // Visibility toggle
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reviewSchema.index({ isActive: 1, displayOrder: 1, createdAt: 1 });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;

