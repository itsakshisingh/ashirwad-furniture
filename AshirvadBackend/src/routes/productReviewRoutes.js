const express = require("express");
const router = express.Router();

const {
  createOrUpdateReview,
  getProductReviews,
  getAllPublicReviews,
  getMyReviews,
  deleteMyReview,
  getAllReviewsAdmin,
  deleteReviewAdmin,
  updateReviewStatusAdmin,
} = require("../controllers/productReviewController");

const { protect, authorize } = require("../middlewares/authMiddleware");
const { uploadReview } = require("../middlewares/uploadMiddleware");

// Public routes
router.get("/product/:productId", getProductReviews);
router.get("/", getAllPublicReviews);

// User authenticated routes
router.post("/", protect, uploadReview.array("images", 5), createOrUpdateReview);
router.get("/my-reviews", protect, getMyReviews);
router.delete("/:id", protect, deleteMyReview);

// Admin routes
router.get("/admin/all", protect, authorize("admin"), getAllReviewsAdmin);
router.patch("/admin/:id/status", protect, authorize("admin"), updateReviewStatusAdmin);
router.delete("/admin/:id", protect, authorize("admin"), deleteReviewAdmin);

module.exports = router;

