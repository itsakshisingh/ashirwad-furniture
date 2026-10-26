
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createAccessToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );

const createRefreshToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

const publicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  mobile: user.mobile,
  email: user.email,
  profileImage: user.profileImage,
  companyName: user.companyName,
  alternateMobile: user.alternateMobile,
  address: user.address,
  role: user.role,
  status: user.status,
  isEmailVerified: user.isEmailVerified,
  isMobileVerified: user.isMobileVerified,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const signup = async (req, res) => {
  try {
    const {
      fullName,
      mobile,
      email,
      password,
      profileImage,
      companyName,
      alternateMobile,
      address,
    } = req.body;

    if (
      typeof fullName !== "string" ||
      fullName.trim().length < 2 ||
      typeof mobile !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 72
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid fullName, mobile, email and password are required. Password must be 8-72 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.trim();

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { mobile: normalizedMobile },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      fullName: fullName.trim(),
      mobile: normalizedMobile,
      email: normalizedEmail,
      password: passwordHash,
      profileImage: profileImage || null,
      companyName: companyName || "",
      alternateMobile: alternateMobile || "",
      address: address || {},
      role: "user",
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        user: publicUser(user),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number is already registered.",
      });
    }

    console.error("Signup error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail })
      .select("+password +refreshTokenHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked or inactive.",
      });
    }

    user.lastLoginAt = new Date();

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: publicUser(user),
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to login.",
    });
  }
};

const adminLogin = async (req, res) => {
  // Admin login accepts only accounts that already have admin role.
  // It does not create or promote users to admin.
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      role: "admin",
    }).select("+password +refreshTokenHash");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Admin account is blocked or inactive.",
      });
    }

    user.lastLoginAt = new Date();

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Admin login successful.",
      data: {
        user: publicUser(user),
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
      },
    });
  } catch (error) {
    console.error("Admin login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to login as admin.",
    });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (typeof refreshToken !== "string" || !refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    const payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    if (payload.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const user = await User.findById(payload.sub)
      .select("+refreshTokenHash");

    if (
      !user ||
      user.status !== "active" ||
      !user.refreshTokenHash ||
      user.refreshTokenHash !== hashToken(refreshToken)
    ) {
      return res.status(401).json({
        success: false,
        message: "Refresh token expired, revoked or invalid.",
      });
    }

    // Rotate refresh token: the previous token becomes invalid.
    const newRefreshToken = createRefreshToken(user);
    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    const accessToken = createAccessToken(user);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Refresh token expired or invalid.",
    });
  }
};

const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("+refreshTokenHash");

    if (user) {
      user.refreshTokenHash = null;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to logout.",
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || user.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "User not found or inactive.",
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: publicUser(user) },
    });
  } catch (error) {
    console.error("Get profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch profile.",
    });
  }
};

module.exports = {
  signup,
  login,
  adminLogin,
  refreshAccessToken,
  logout,
  getMe,
};
