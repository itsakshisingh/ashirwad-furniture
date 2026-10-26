
const express = require("express");
const router = express.Router();

const {
  getActiveBanners,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  updateBannerStatus,
  deleteBanner,
  reorderBanners,
} = require("../controllers/bannerController");

const {
  protect,
  authorize,
} = require("../middlewares/authMiddleware");

const { uploadBanner } = require("../middlewares/uploadMiddleware");

// Public APIs
router.get("/", getActiveBanners);

// Admin APIs
router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  getAllBanners
);

router.get(
  "/admin/:id",
  protect,
  authorize("admin"),
  getBannerById
);

router.post(
  "/admin",
  protect,
  authorize("admin"),
  uploadBanner.fields([
    { name: "image", maxCount: 10 },
    { name: "mobileImage", maxCount: 1 },
  ]),
  createBanner
);

router.patch(
  "/admin/reorder",
  protect,
  authorize("admin"),
  reorderBanners
);

router.patch(
  "/admin/:id/status",
  protect,
  authorize("admin"),
  updateBannerStatus
);

router.patch(
  "/admin/:id",
  protect,
  authorize("admin"),
  uploadBanner.fields([
    { name: "image", maxCount: 10 },
    { name: "mobileImage", maxCount: 1 },
  ]),
  updateBanner
);

router.delete(
  "/admin/:id",
  protect,
  authorize("admin"),
  deleteBanner
);

module.exports = router;
