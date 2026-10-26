
const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    subtitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    // Multiple images for one banner
    image: {
  type: [String],
  required: true,
  validate: {
    validator: (images) =>
      Array.isArray(images) &&
      images.length >= 1 &&
      images.every(
        (url) =>
          typeof url === "string" &&
          url.trim().length > 0
      ),
    message: "At least one valid image URL is required.",
  },
},

    mobileImage: {
      type: String,
      default: null,
      trim: true,
    },


    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },


  },
  {
    timestamps: true,
    versionKey: false,
  }
);

bannerSchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model("Banner", bannerSchema);
