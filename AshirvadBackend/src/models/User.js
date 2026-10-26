
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, trim: true, default: "" },
    addressLine2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    profileImage: {
      type: String,
      default: null,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    alternateMobile: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: addressSchema,
      default: () => ({}),
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      immutable: true,
    },

    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isMobileVerified: {
      type: Boolean,
      default: false,
    },

    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("User", userSchema);
