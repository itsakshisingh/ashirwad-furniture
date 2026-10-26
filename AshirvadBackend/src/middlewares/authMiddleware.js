
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    const user = await User.findById(payload.sub);

    if (!user || user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "User not found or account inactive.",
      });
    }

    // Read the current role from the database, not only from the token.
    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided - continue as guest
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(payload.sub);

    if (!user || user.status !== "active") {
      // Invalid user - continue as guest
      req.user = null;
      return next();
    }

    // User is authenticated - attach user info
    req.user = {
      _id: user._id,
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      mobile: user.mobile,
      address: user.address,
    };

    next();
  } catch (error) {
    // Token verification failed - continue as guest
    req.user = null;
    next();
  }
};

module.exports = { protect, authorize, optionalAuth };
