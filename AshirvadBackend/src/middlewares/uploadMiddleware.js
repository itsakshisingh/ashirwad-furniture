const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Common settings for images
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

// Gallery settings: supports Images and Videos
const galleryAllowedExtensions = [
  // Images
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg",
  // Videos
  ".mp4", ".webm", ".mkv", ".mov", ".avi", ".m4v",
];

const galleryAllowedMimeTypes = [
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/pjpeg",
  // Videos
  "video/mp4",
  "video/webm",
  "video/x-matroska",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-m4v",
  "video/ogg",
];

const galleryFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    !galleryAllowedExtensions.includes(ext) ||
    !galleryAllowedMimeTypes.includes(file.mimetype)
  ) {
    return cb(
      new Error(
        "Only Photos (JPG, PNG, WebP, GIF, SVG) and Videos (MP4, WebM, MKV, MOV) are allowed."
      )
    );
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
const uploadReview = createUpload("reviews");

// Dedicated Gallery upload with 100MB limit supporting Image/Video/PDF
const uploadGallery = multer({
  storage: createStorage("gallery"),
  fileFilter: galleryFileFilter,
  limits: {
    files: 5,
    fileSize: 100 * 1024 * 1024, // 100 MB max file size
  },
});

module.exports = {
  uploadBanner,
  uploadCategory,
  uploadSubcategory,
  uploadProduct,
  uploadGallery,
  uploadReview,
};
