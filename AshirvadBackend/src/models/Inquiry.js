const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    customerEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    customerAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    selectedVariant: {
      type: String,
      default: "",
      trim: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "responded", "accepted", "rejected", "completed"],
      default: "pending",
      index: true,
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    quotedPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    // Snapshot of product details at the time of inquiry
    productSnapshot: {
      name: String,
      sku: String,
      pricing: {
        price: Number,
        salePrice: Number,
        currency: String,
      },
      images: [String],
      specifications: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for performance
inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ customerEmail: 1 });

module.exports = mongoose.model("Inquiry", inquirySchema);
