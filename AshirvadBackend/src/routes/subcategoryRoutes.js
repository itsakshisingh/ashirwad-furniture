const express = require("express");
const router = express.Router();

const {
  getActiveSubcategories,
  getSubcategoriesByCategory,
  getSubcategoryBySlug,
  getAllSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  updateSubcategoryStatus,
  reorderSubcategories,
  deleteSubcategory,
} = require("../controllers/subcategoryController");

const { protect, authorize } = require("../middlewares/authMiddleware");

const { uploadSubcategory } = require("../middlewares/uploadMiddleware");

// Public APIs
router.get("/", getActiveSubcategories);
router.get("/category/:categoryId", getSubcategoriesByCategory);
router.get("/slug/:slug", getSubcategoryBySlug);

// Admin APIs
router.get("/admin/all", protect, authorize("admin"), getAllSubcategories);

router.get("/admin/:id", protect, authorize("admin"), getSubcategoryById);

router.post(
  "/admin",
  protect,
  authorize("admin"),
  uploadSubcategory.array("images", 10),
  createSubcategory
);

router.patch(
  "/admin/reorder",
  protect,
  authorize("admin"),
  reorderSubcategories
);

router.patch(
  "/admin/:id/status",
  protect,
  authorize("admin"),
  updateSubcategoryStatus
);

router.patch(
  "/admin/:id",
  protect,
  authorize("admin"),
  uploadSubcategory.array("images", 10),
  updateSubcategory
);

router.delete("/admin/:id", protect, authorize("admin"), deleteSubcategory);

module.exports = router;
