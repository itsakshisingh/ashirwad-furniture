const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const Media = require("../models/Media");
const Gallery = require("../models/Gallery");

const uploadDir = path.join(process.cwd(), "uploads", "gallery");

// Helper to determine media type from mimetype or filename extension
const detectMediaType = (mimetype = "", filename = "") => {
  const ext = path.extname(filename).toLowerCase();

  if (
    mimetype.startsWith("video/") ||
    [".mp4", ".webm", ".mkv", ".mov", ".avi", ".m4v"].includes(ext)
  ) {
    return "video";
  }

  return "image";
};

// Helper to delete local uploaded file
const deleteLocalFile = async (filePath) => {
  if (!filePath || typeof filePath !== "string") return;

  try {
    const filename = path.basename(filePath);
    const fullPath = path.join(uploadDir, filename);
    await Media.deleteOne({ filename });
  } catch (err) {
    // Ignore ENOENT (file not found)
    if (err.code !== "ENOENT") {
      console.warn("Delete local gallery file warning:", err.message);
    }
  }
};

// PUBLIC: Get active gallery items
const getGalleryItems = async (req, res) => {
  try {
    const { mediaType, category, q, page = 1, limit = 50 } = req.query;

    const query = { isActive: true };

    if (mediaType && ["image", "video", "pdf"].includes(mediaType.toLowerCase())) {
      query.mediaType = mediaType.toLowerCase();
    }

    if (category && category !== "All") {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
    }

    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), "i");
      query.$or = [{ title: searchRegex }, { description: searchRegex }, { category: searchRegex }];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const items = await Gallery.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Gallery.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Gallery items fetched successfully.",
      count: items.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: items,
    });
  } catch (error) {
    console.error("Get gallery items:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch gallery items.",
    });
  }
};

// PUBLIC: Get distinct categories
const getGalleryCategories = async (req, res) => {
  try {
    const categories = await Gallery.distinct("category", { isActive: true });
    return res.status(200).json({
      success: true,
      data: categories.filter(Boolean),
    });
  } catch (error) {
    console.error("Get gallery categories:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch gallery categories.",
    });
  }
};

// PUBLIC: Get single gallery item by ID
const getGalleryItemById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery item ID.",
      });
    }

    const item = await Gallery.findOne({ _id: req.params.id, isActive: true }).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Get gallery item by id:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch gallery item.",
    });
  }
};

// ADMIN: Get all gallery items (supports search, filters, pagination)
const getAllGalleryItemsAdmin = async (req, res) => {
  try {
    const { mediaType, category, isActive, q, page = 1, limit = 50 } = req.query;

    const query = {};

    if (mediaType && ["image", "video", "pdf"].includes(mediaType.toLowerCase())) {
      query.mediaType = mediaType.toLowerCase();
    }

    if (category && category !== "All") {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
    }

    if (isActive !== undefined && isActive !== "") {
      query.isActive = isActive === true || isActive === "true";
    }

    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), "i");
      query.$or = [{ title: searchRegex }, { description: searchRegex }, { category: searchRegex }];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const items = await Gallery.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Gallery.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: items.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: items,
    });
  } catch (error) {
    console.error("Admin get gallery items:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch gallery items.",
    });
  }
};

// ADMIN: Create gallery item (Upload Photo or Video)
const createGalleryItem = async (req, res) => {
  const uploadedFiles = [];

  try {
    const body = req.body;

    // Resolve primary file and optional thumbnail
    let primaryFile = null;
    let thumbFile = null;

    if (req.files) {
      if (Array.isArray(req.files)) {
        primaryFile = req.files[0];
        thumbFile = req.files[1] || null;
      } else {
        primaryFile = req.files.file ? req.files.file[0] : (req.files.media ? req.files.media[0] : null);
        thumbFile = req.files.thumbnail ? req.files.thumbnail[0] : null;
      }
    } else if (req.file) {
      primaryFile = req.file;
    }

    if (primaryFile) uploadedFiles.push(primaryFile.filename);
    if (thumbFile) uploadedFiles.push(thumbFile.filename);

    if (!primaryFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload a media file (Photo or Video).",
      });
    }

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      await Promise.all(uploadedFiles.map(deleteLocalFile));
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    const detectedType = detectMediaType(primaryFile.mimetype, primaryFile.originalname);
    const mediaType = (body.mediaType && ["image", "video"].includes(body.mediaType.toLowerCase()))
      ? body.mediaType.toLowerCase()
      : detectedType;

    const fileUrl = `/uploads/gallery/${primaryFile.filename}`;
    const thumbnailUrl = thumbFile ? `/uploads/gallery/${thumbFile.filename}` : (mediaType === "image" ? fileUrl : "");

    const item = await Gallery.create({
      title: body.title.trim(),
      description: body.description ? body.description.trim() : "",
      mediaType,
      fileUrl,
      thumbnailUrl,
      fileName: primaryFile.originalname,
      fileSize: primaryFile.size || 0,
      mimeType: primaryFile.mimetype || "",
      category: body.category && body.category.trim() ? body.category.trim() : "General",
      displayOrder: Number(body.displayOrder || 0),
      isActive: body.isActive === undefined ? true : (body.isActive === true || body.isActive === "true"),
    });

    return res.status(201).json({
      success: true,
      message: "Gallery item created successfully.",
      data: item,
    });
  } catch (error) {
    await Promise.all(uploadedFiles.map(deleteLocalFile));
    console.error("Create gallery item:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create gallery item: " + error.message,
    });
  }
};

// ADMIN: Update gallery item
const updateGalleryItem = async (req, res) => {
  const newUploadedFiles = [];

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery item ID.",
      });
    }

    const item = await Gallery.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found.",
      });
    }

    const body = req.body;

    let primaryFile = null;
    let thumbFile = null;

    if (req.files) {
      if (Array.isArray(req.files)) {
        primaryFile = req.files[0];
        thumbFile = req.files[1] || null;
      } else {
        primaryFile = req.files.file ? req.files.file[0] : (req.files.media ? req.files.media[0] : null);
        thumbFile = req.files.thumbnail ? req.files.thumbnail[0] : null;
      }
    } else if (req.file) {
      primaryFile = req.file;
    }

    if (primaryFile) newUploadedFiles.push(primaryFile.filename);
    if (thumbFile) newUploadedFiles.push(thumbFile.filename);

    const oldFileUrl = item.fileUrl;
    const oldThumbnailUrl = item.thumbnailUrl;

    // Update basic fields
    if (body.title !== undefined) item.title = body.title.trim();
    if (body.description !== undefined) item.description = body.description.trim();
    if (body.category !== undefined) item.category = body.category.trim() || "General";
    if (body.displayOrder !== undefined) item.displayOrder = Number(body.displayOrder || 0);
    if (body.isActive !== undefined) {
      item.isActive = body.isActive === true || body.isActive === "true";
    }

    // Handle primary file replacement
    if (primaryFile) {
      const detectedType = detectMediaType(primaryFile.mimetype, primaryFile.originalname);
      item.mediaType = (body.mediaType && ["image", "video"].includes(body.mediaType.toLowerCase()))
        ? body.mediaType.toLowerCase()
        : detectedType;

      item.fileUrl = `/uploads/gallery/${primaryFile.filename}`;
      item.fileName = primaryFile.originalname;
      item.fileSize = primaryFile.size || 0;
      item.mimeType = primaryFile.mimetype || "";

      // If it's an image and no custom thumbnail was set, use fileUrl
      if (item.mediaType === "image" && !thumbFile) {
        item.thumbnailUrl = item.fileUrl;
      }
    } else if (body.mediaType && ["image", "video"].includes(body.mediaType.toLowerCase())) {
      item.mediaType = body.mediaType.toLowerCase();
    }

    // Handle thumbnail replacement
    if (thumbFile) {
      item.thumbnailUrl = `/uploads/gallery/${thumbFile.filename}`;
    }

    await item.save();

    // Clean up old files if replaced
    if (primaryFile && oldFileUrl && oldFileUrl !== item.fileUrl) {
      await deleteLocalFile(oldFileUrl);
    }
    if (thumbFile && oldThumbnailUrl && oldThumbnailUrl !== item.thumbnailUrl && oldThumbnailUrl !== oldFileUrl) {
      await deleteLocalFile(oldThumbnailUrl);
    }

    return res.status(200).json({
      success: true,
      message: "Gallery item updated successfully.",
      data: item,
    });
  } catch (error) {
    await Promise.all(newUploadedFiles.map(deleteLocalFile));
    console.error("Update gallery item:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update gallery item: " + error.message,
    });
  }
};

// ADMIN: Update item status (toggle active/inactive)
const updateGalleryStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery item ID.",
      });
    }

    const { isActive } = req.body;

    const item = await Gallery.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found.",
      });
    }

    item.isActive = isActive !== undefined ? (isActive === true || isActive === "true") : !item.isActive;
    await item.save();

    return res.status(200).json({
      success: true,
      message: `Gallery item ${item.isActive ? "activated" : "deactivated"} successfully.`,
      data: item,
    });
  } catch (error) {
    console.error("Update gallery status:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update gallery item status.",
    });
  }
};

// ADMIN: Delete gallery item
const deleteGalleryItem = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery item ID.",
      });
    }

    const item = await Gallery.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found.",
      });
    }

    const fileUrl = item.fileUrl;
    const thumbnailUrl = item.thumbnailUrl;

    await item.deleteOne();

    // Delete disk files
    if (fileUrl) await deleteLocalFile(fileUrl);
    if (thumbnailUrl && thumbnailUrl !== fileUrl) await deleteLocalFile(thumbnailUrl);

    return res.status(200).json({
      success: true,
      message: "Gallery item deleted successfully.",
    });
  } catch (error) {
    console.error("Delete gallery item:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to delete gallery item.",
    });
  }
};

module.exports = {
  getGalleryItems,
  getGalleryCategories,
  getGalleryItemById,
  getAllGalleryItemsAdmin,
  createGalleryItem,
  updateGalleryItem,
  updateGalleryStatus,
  deleteGalleryItem,
};

