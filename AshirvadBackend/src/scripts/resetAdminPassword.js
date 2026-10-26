
require("dotenv").config({ path: "./src/.env" });

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const resetAdmin = async () => {
  try {
    const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const newPassword = process.env.ADMIN_PASSWORD || "";

    if (!email || !newPassword) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const admin = await User.findOne({ email, role: "admin" }).select("+password");

    if (!admin) {
      throw new Error(`No admin found with email: ${email}`);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    admin.password = passwordHash;
    // Clear any existing refresh token so old sessions are invalidated
    admin.refreshTokenHash = null;
    await admin.save();

    console.log(`✅ Admin password reset successfully for: ${email}`);
    console.log(`   New password: ${newPassword}`);
  } catch (error) {
    console.error("❌ Reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

resetAdmin();
