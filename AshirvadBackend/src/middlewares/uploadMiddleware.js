
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Common settings
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    !allowedExtensions.includes(ext) ||
    !allowedMimeTypes.includes(file.mimetype)
  ) {
    return cb(new Error("Only JPG, PNG and WebP images are allowed."));
  }

  cb(null, true);
};

// Helper function to create storage for different folders
const createStorage = (folderName) => {
  const uploadDir = path.join(process.cwd(), "uploads", folderName);
  fs.mkdirSync(uploadDir, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
      cb(null, filename);
    },
  });
};

// Helper function to create multer instance
const createUpload = (folderName) => {
  return multer({
    storage: createStorage(folderName),
    fileFilter,
    limits: {
      files: 10,
      fileSize: 5 * 1024 * 1024,
    },
  });
};

// Export different upload instances
const uploadBanner = createUpload("banners");
const uploadCategory = createUpload("categories");
const uploadSubcategory = createUpload("subcategories");
const uploadProduct = createUpload("products");

module.exports = {
  uploadBanner,
  uploadCategory,
  uploadSubcategory,
  uploadProduct,
};
