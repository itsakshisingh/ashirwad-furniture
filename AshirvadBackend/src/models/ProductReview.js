const mongoose = require("mongoose");

const productReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    inquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inquiry",
      default: null,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required (1 to 5 stars)"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      maxlength: 3000,
    },
    images: {
      type: [String],
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
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

// Compound index so a user cannot submit duplicate reviews for the same product
productReviewSchema.index({ product: 1, user: 1 }, { unique: true });
productReviewSchema.index({ product: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model("ProductReview", productReviewSchema);
