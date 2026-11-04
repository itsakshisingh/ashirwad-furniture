const express = require("express");
const router = express.Router();

const {
  getReviews,
  getAllReviewsAdmin,
  getReviewById,
  createReview,
  updateReview,
  updateReviewStatus,
  deleteReview,
  seedReviews,
} = require("../controllers/reviewController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// Public routes
router.get("/", getReviews);
router.get("/:id", getReviewById);

// Admin routes
router.get("/admin/all", protect, authorize("admin"), getAllReviewsAdmin);
router.post("/admin", protect, authorize("admin"), createReview);
router.put("/admin/:id", protect, authorize("admin"), updateReview);
router.patch("/admin/:id", protect, authorize("admin"), updateReview);
router.patch("/admin/:id/status", protect, authorize("admin"), updateReviewStatus);
router.delete("/admin/:id", protect, authorize("admin"), deleteReview);
router.post("/admin/seed", protect, authorize("admin"), seedReviews);

module.exports = router;

