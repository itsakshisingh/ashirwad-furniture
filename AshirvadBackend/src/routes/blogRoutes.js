const express = require("express");
const router = express.Router();

const {
  getBlogs,
  getBlogBySlug,
  getBlogCategories,
  getAllBlogsAdmin,
  getBlogById,
  createBlog,
  updateBlog,
  updateBlogStatus,
  toggleBlogFeatured,
  deleteBlog,
} = require("../controllers/blogController");

const { protect, authorize } = require("../middlewares/authMiddleware");
const { uploadBlog } = require("../middlewares/uploadMiddleware");

// Public routes
router.get("/", getBlogs);
router.get("/categories", getBlogCategories);
router.get("/slug/:slug", getBlogBySlug);
router.get("/:id", getBlogById);

// Admin routes (Protected)
router.get("/admin/all", protect, authorize("admin"), getAllBlogsAdmin);
router.post("/admin", protect, authorize("admin"), uploadBlog.single("featuredImage"), createBlog);
router.put("/admin/:id", protect, authorize("admin"), uploadBlog.single("featuredImage"), updateBlog);
router.patch("/admin/:id", protect, authorize("admin"), uploadBlog.single("featuredImage"), updateBlog);
router.patch("/admin/:id/status", protect, authorize("admin"), updateBlogStatus);
router.patch("/admin/:id/featured", protect, authorize("admin"), toggleBlogFeatured);
router.delete("/admin/:id", protect, authorize("admin"), deleteBlog);

module.exports = router;
