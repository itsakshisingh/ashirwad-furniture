const express = require("express");
const router = express.Router();

const {
  getGalleryItems,
  getGalleryCategories,
  getGalleryItemById,
  getAllGalleryItemsAdmin,
  createGalleryItem,
  updateGalleryItem,
  updateGalleryStatus,
  deleteGalleryItem,
} = require("../controllers/galleryController");

const { protect, authorize } = require("../middlewares/authMiddleware");
const { uploadGallery } = require("../middlewares/uploadMiddleware");

// Accepts primary file (named "file" or "media") and optional "thumbnail"
const galleryUploadFields = uploadGallery.fields([
  { name: "file", maxCount: 1 },
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// Public APIs
router.get("/", getGalleryItems);
router.get("/categories", getGalleryCategories);
router.get("/:id", getGalleryItemById);

// Admin APIs
router.get("/admin/all", protect, authorize("admin"), getAllGalleryItemsAdmin);
router.post(
  "/admin",
  protect,
  authorize("admin"),
  galleryUploadFields,
  createGalleryItem
);
router.put(
  "/admin/:id",
  protect,
  authorize("admin"),
  galleryUploadFields,
  updateGalleryItem
);
router.patch(
  "/admin/:id",
  protect,
  authorize("admin"),
  galleryUploadFields,
  updateGalleryItem
);
router.patch(
  "/admin/:id/status",
  protect,
  authorize("admin"),
  updateGalleryStatus
);
router.delete("/admin/:id", protect, authorize("admin"), deleteGalleryItem);

module.exports = router;
