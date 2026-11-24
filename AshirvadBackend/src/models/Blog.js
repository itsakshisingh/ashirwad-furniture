const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "FAQ question is required"],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, "FAQ answer is required"],
      trim: true,
    },
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    metaTitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    metaDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Blog content/description is required"],
      trim: true,
    },
    author: {
      type: String,
      default: "Admin",
      trim: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "scheduled", "archived"],
      default: "published",
      index: true,
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    featuredImage: {
      type: String,
      default: "",
      trim: true,
    },
    faqs: {
      type: [faqSchema],
      default: [],
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Search and performance indexes
blogSchema.index({ title: "text", description: "text", category: "text" });
blogSchema.index({ status: 1, isFeatured: 1, createdAt: -1 });

module.exports = mongoose.model("Blog", blogSchema);
