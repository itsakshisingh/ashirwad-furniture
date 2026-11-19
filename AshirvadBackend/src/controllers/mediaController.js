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
 * Supports HTTP Range requests for video streaming (seeking, scrubbing)
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
      const contentType = media.contentType || "application/octet-stream";
      const totalSize = media.size || media.data.length;

      res.set("Content-Type", contentType);
      res.set("Accept-Ranges", "bytes");

      // Handle Range request for video streaming
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize) {
          res.status(416).set("Content-Range", `bytes */${totalSize}`);
          return res.end();
        }

        const chunkSize = end - start + 1;
        const bufferChunk = media.data.subarray(start, end + 1);

        res.status(206);
        res.set({
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": chunkSize,
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        return res.send(bufferChunk);
      }

      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.set("Content-Length", totalSize);
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
      message: "Media not found",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  serveMedia,
};
