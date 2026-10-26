const express = require("express");
const router = express.Router();

const {
  getActiveCategories,
  getCategoryBySlug,
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  reorderCategories,
  deleteCategory,
} = require("../controllers/categoryController");

const { protect, authorize } = require("../middlewares/authMiddleware");

const { uploadCategory } = require("../middlewares/uploadMiddleware");

// Public APIs
router.get("/", getActiveCategories);
router.get("/slug/:slug", getCategoryBySlug);

// Admin APIs
router.get("/admin/all", protect, authorize("admin"), getAllCategories);

router.get("/admin/:id", protect, authorize("admin"), getCategoryById);

router.post(
  "/admin",
  protect,
  authorize("admin"),
  uploadCategory.array("image", 10),
  createCategory
);

router.patch("/admin/reorder", protect, authorize("admin"), reorderCategories);

router.patch(
  "/admin/:id/status",
  protect,
  authorize("admin"),
  updateCategoryStatus
);

router.patch(
  "/admin/:id",
  protect,
  authorize("admin"),
  uploadCategory.array("image", 10),
  updateCategory
);

router.delete("/admin/:id", protect, authorize("admin"), deleteCategory);

module.exports = router;
