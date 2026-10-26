const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    shortDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      default: null,
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    thumbnail: {
      type: String,
      default: "",
    },
    pricing: {
      price: {
        type: Number,
        required: true,
        min: 0,
      },
      salePrice: {
        type: Number,
        default: null,
        min: 0,
      },
      currency: {
        type: String,
        default: "INR",
        uppercase: true,
      },
      taxPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    inventory: {
      stockQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },
      lowStockThreshold: {
        type: Number,
        default: 5,
        min: 0,
      },
      stockStatus: {
        type: String,
        enum: ["in_stock", "out_of_stock", "low_stock", "discontinued"],
        default: "in_stock",
      },
      allowBackorder: {
        type: Boolean,
        default: false,
      },
    },
    specifications: {
      brand: {
        type: String,
        default: "",
        trim: true,
      },
      material: {
        type: String,
        default: "",
        trim: true,
      },
      upholstery: {
        type: String,
        default: "",
        trim: true,
      },
      color: {
        type: String,
        default: "",
        trim: true,
      },
      seatingCapacity: {
        type: Number,
        default: null,
        min: 0,
      },
      dimensions: {
        length: {
          type: Number,
          default: null,
        },
        width: {
          type: Number,
          default: null,
        },
        height: {
          type: Number,
          default: null,
        },
        unit: {
          type: String,
          default: "cm",
        },
      },
      weight: {
        type: Number,
        default: null,
      },
      weightUnit: {
        type: String,
        default: "kg",
      },
      assemblyRequired: {
        type: Boolean,
        default: false,
      },
      warranty: {
        type: String,
        default: "",
        trim: true,
      },
    },
    variants: [
      {
        name: {
          type: String,
          trim: true,
        },
        options: [String],
      },
    ],
    delivery: {
      freeDelivery: {
        type: Boolean,
        default: false,
      },
      estimatedDays: {
        type: String,
        default: "",
        trim: true,
      },
      returnable: {
        type: Boolean,
        default: true,
      },
      returnWindowDays: {
        type: Number,
        default: 7,
        min: 0,
      },
    },
    tags: {
      type: [String],
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    seo: {
      metaTitle: {
        type: String,
        default: "",
        trim: true,
      },
      metaDescription: {
        type: String,
        default: "",
        trim: true,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for performance
// Note: slug and sku already indexed via unique:true in field definition
productSchema.index({ category: 1, subcategory: 1, displayOrder: 1 });
productSchema.index({ "pricing.price": 1 });
productSchema.index({ tags: 1 });

module.exports = mongoose.model("Product", productSchema);
