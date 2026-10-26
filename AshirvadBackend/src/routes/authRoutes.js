
const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  adminLogin,
  refreshAccessToken,
  logout,
  getMe,
} = require("../controllers/authController");

const {
  protect,
  authorize,
} = require("../middlewares/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.post("/admin/login", adminLogin);
router.post("/refresh", refreshAccessToken);

router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

router.get(
  "/admin/me",
  protect,
  authorize("admin"),
  getMe
);

module.exports = router;
