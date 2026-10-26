
require("dotenv").config({ path: "./src/.env" });

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const createAdmin = async () => {
  try {
    if (
      !process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_MOBILE ||
      !process.env.ADMIN_PASSWORD ||
      !process.env.ADMIN_NAME
    ) {
      throw new Error("Admin environment variables are required.");
    }

    if (process.env.ADMIN_PASSWORD.length < 12 ||
        process.env.ADMIN_PASSWORD.length > 72) {
      throw new Error("Admin password must be 12-72 characters.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const mobile = process.env.ADMIN_MOBILE.trim();

    const existing = await User.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existing) {
      throw new Error(
        "Email or mobile already exists. No account was changed."
      );
    }

    const password = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      12
    );

    await User.create({
      fullName: process.env.ADMIN_NAME.trim(),
      email,
      mobile,
      password,
      role: "admin",
      status: "active",
      isEmailVerified: false,
      isMobileVerified: false,
    });

    console.log("Admin account created successfully.");
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
