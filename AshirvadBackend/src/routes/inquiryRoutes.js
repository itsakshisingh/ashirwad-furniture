const express = require("express");
const router = express.Router();

const {
  createInquiry,
  getInquiryById,
  getAllInquiries,
  getInquiryByIdAdmin,
  updateInquiry,
  deleteInquiry,
  getInquiryStats,
} = require("../controllers/inquiryController");

const { protect, authorize, optionalAuth } = require("../middlewares/authMiddleware");

// Public APIs (optionalAuth allows both logged-in and guest users)
router.post("/", optionalAuth, createInquiry);

// Admin APIs
router.get("/admin/all", protect, authorize("admin"), getAllInquiries);
router.get("/admin/stats", protect, authorize("admin"), getInquiryStats);
router.get("/admin/:id", protect, authorize("admin"), getInquiryByIdAdmin);
router.patch("/admin/:id", protect, authorize("admin"), updateInquiry);
router.delete("/admin/:id", protect, authorize("admin"), deleteInquiry);

// Public: customer ko apni inquiry ka status dekhne ke liye (LAST me rakho)
router.get("/:id", getInquiryById);

module.exports = router;
