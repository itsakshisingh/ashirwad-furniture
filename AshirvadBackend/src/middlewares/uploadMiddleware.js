const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const Media = require("../models/Media");

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

/**
 * Middleware that takes file buffers stored in memory by multer
 * and saves them directly into MongoDB Atlas "medias" collection.
 * No files are saved on the local disk!
 */
const saveToMongo = (folder) => async (req, res, next) => {
  try {
    const processFile = async (f) => {
      if (!f || !f.buffer) return;
      const ext = path.extname(f.originalname).toLowerCase();
      const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
      f.filename = filename;
      f.fileUrl = `/uploads/${folder}/${filename}`;

      await Media.create({
        filename,
        originalName: f.originalname,
        contentType: f.mimetype || "image/jpeg",
        data: f.buffer,
        size: f.size || f.buffer.length,
        folder,
      });
    };

    if (req.file) {
      await processFile(req.file);
    }

    if (req.files) {
      if (Array.isArray(req.files)) {
        for (const f of req.files) {
          await processFile(f);
        }
      } else {
        for (const field of Object.keys(req.files)) {
          const list = req.files[field];
          if (Array.isArray(list)) {
            for (const f of list) {
              await processFile(f);
            }
          }
        }
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to create a memory multer instance that saves into MongoDB
 */
const createMongoUpload = (folderName, options = {}) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: options.fileFilter || fileFilter,
    limits: options.limits || {
      files: 10,
      fileSize: 10 * 1024 * 1024,
    },
  });

  const wrap = (multerMiddleware) => [multerMiddleware, saveToMongo(folderName)];

  return {
    single: (fieldName) => wrap(upload.single(fieldName)),
    array: (fieldName, maxCount) => wrap(upload.array(fieldName, maxCount)),
    fields: (fieldsArray) => wrap(upload.fields(fieldsArray)),
    any: () => wrap(upload.any()),
  };
};

// Export different upload instances (all write to MongoDB Atlas)
const uploadBanner = createMongoUpload("banners");
const uploadCategory = createMongoUpload("categories");
const uploadSubcategory = createMongoUpload("subcategories");
const uploadProduct = createMongoUpload("products");
const uploadReview = createMongoUpload("reviews");
const uploadGallery = createMongoUpload("gallery", {
  fileFilter: galleryFileFilter,
  limits: {
    files: 5,
    fileSize: 100 * 1024 * 1024,
  },
});

module.exports = {
  uploadBanner,
  uploadCategory,
  uploadSubcategory,
  uploadProduct,
  uploadGallery,
  uploadReview,
  saveToMongo,
};
