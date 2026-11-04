const Media = require("../models/Media");
const path = require("path");
const fs = require("fs");

/**
 * Serve media file directly from MongoDB Atlas Buffer
 * Supports:
 * - /uploads/:folder/:filename
 * - /uploads/:filename
 * - /product-images/:filename
 * - /api/v1/media/:id
 */
const serveMedia = async (req, res, next) => {
  try {
    const filename = req.params.filename || path.basename(req.path);
    const id = req.params.id;

    let media = null;

    if (id && /^[0-9a-fA-F]{24}$/.test(id)) {
      media = await Media.findById(id);
    }

    if (!media && filename) {
      media = await Media.findOne({ filename });
    }

    if (media && media.data) {
      res.set("Content-Type", media.contentType || "image/jpeg");
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.set("Content-Length", media.size || media.data.length);
      return res.send(media.data);
    }

    // Fallback: check if file exists on disk
    const diskPath = path.join(__dirname, "../../uploads", req.params.folder || "", filename);
    if (fs.existsSync(diskPath) && fs.statSync(diskPath).isFile()) {
      return res.sendFile(diskPath);
    }

    // Not found
    return res.status(404).json({
      success: false,
      message: "Image not found",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  serveMedia,
};
