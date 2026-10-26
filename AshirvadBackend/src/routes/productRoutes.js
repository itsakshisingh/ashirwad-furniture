const express = require("express");
const router = express.Router();

const {
  getActiveProducts,
  getProductBySlug,
  getFeaturedProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} = require("../controllers/productController");

const { protect, authorize } = require("../middlewares/authMiddleware");

const { uploadProduct } = require("../middlewares/uploadMiddleware");

// Public APIs
router.get("/", getActiveProducts);
router.get("/featured", getFeaturedProducts);
router.get("/slug/:slug", getProductBySlug);

// Admin APIs
router.get("/admin/all", protect, authorize("admin"), getAllProducts);

router.get("/admin/:id", protect, authorize("admin"), getProductById);

router.post(
  "/admin",
  protect,
  authorize("admin"),
  uploadProduct.array("images", 10),
  createProduct
);

router.patch(
  "/admin/:id/status",
  protect,
  authorize("admin"),
  updateProductStatus
);

router.patch(
  "/admin/:id",
  protect,
  authorize("admin"),
  uploadProduct.array("images", 10),
  updateProduct
);

router.delete("/admin/:id", protect, authorize("admin"), deleteProduct);

module.exports = router;
