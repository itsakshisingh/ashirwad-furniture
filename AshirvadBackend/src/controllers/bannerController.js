
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const Banner = require("../models/Banner");

const uploadDir = path.join(
  process.cwd(),
  "uploads",
  "banners"
);

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};


const getUploadedImages = (req) =>
  ((req.files?.image) || []).map(
    (file) => `/uploads/banners/${file.filename}`
  );

// mobileImage single file from fields upload
const getUploadedMobileImage = (req) => {
  const f = req.files?.mobileImage?.[0];
  return f ? `/uploads/banners/${f.filename}` : null;
};

const deleteLocalImages = async (images = []) => {
  await Promise.allSettled(
    images.map(async (image) => {
      if (typeof image !== "string") return;

      const filename = path.basename(image);

      // Only delete files from our banner upload directory.
      if (filename !== image.replace(/^.*\//, "")) return;

      await fs.unlink(path.join(uploadDir, filename));
    })
  );
};

const validateBanner = (data, partial = false) => {
  const errors = [];

  if (
    !partial &&
    (typeof data.title !== "string" || !data.title.trim())
  ) {
    errors.push("title is required.");
  }

  if (
    data.title !== undefined &&
    (typeof data.title !== "string" || data.title.length > 150)
  ) {
    errors.push("title must be a string of at most 150 characters.");
  }

  if (
    data.subtitle !== undefined &&
    (typeof data.subtitle !== "string" || data.subtitle.length > 500)
  ) {
    errors.push("subtitle must be a string of at most 500 characters.");
  }

  if (
    data.displayOrder !== undefined &&
    (!Number.isInteger(Number(data.displayOrder)) ||
      Number(data.displayOrder) < 0)
  ) {
    errors.push("displayOrder must be a non-negative integer.");
  }

  if (
    data.isActive !== undefined &&
    ![true, false, "true", "false"].includes(data.isActive)
  ) {
    errors.push("isActive must be true or false.");
  }

  if (
    data.image !== undefined &&
    (!Array.isArray(data.image) ||
      data.image.some(
        (url) => typeof url !== "string" || !isValidUrl(url)
      ))
  ) {
    errors.push("image must be an array of valid image URLs.");
  }

  return errors;
};

// PUBLIC: Get active banners for home page
const getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Banners fetched successfully.",
      count: banners.length,
      data: banners,
    });
  } catch (error) {
    console.error("Get active banners:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch banners.",
    });
  }
};

// ADMIN: Get all banners, including inactive
const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find({})
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: banners.length,
      data: banners,
    });
  } catch (error) {
    console.error("Get all banners:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch banners.",
    });
  }
};

// ADMIN: Get one banner
const getBannerById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID.",
      });
    }

    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.error("Get banner:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch banner.",
    });
  }
};

// ADMIN: Create banner with multiple local images
const createBanner = async (req, res) => {
  const uploadedImages = getUploadedImages(req);

  try {
    const body = req.body;
    const errors = validateBanner(body);

    if (errors.length) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image using the image field.",
      });
    }

    // Handle mobileImage file upload
    const uploadedMobileImage = getUploadedMobileImage(req);

    const banner = await Banner.create({
      title: body.title.trim(),
      subtitle: body.subtitle || "",
      image: uploadedImages,
      mobileImage: uploadedMobileImage || null,
      displayOrder: Number(body.displayOrder || 0),
      isActive: body.isActive === undefined
        ? true
        : body.isActive === true || body.isActive === "true",
    });

    return res.status(201).json({
      success: true,
      message: "Banner created successfully.",
      data: banner,
    });
  } catch (error) {
    await deleteLocalImages(uploadedImages);

    console.error("Create banner:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message === "Invalid date."
        ? error.message
        : "Unable to create banner.",
    });
  }
};

// ADMIN: Update text, settings or replace images
const updateBanner = async (req, res) => {
  const uploadedImages = getUploadedImages(req);

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Invalid banner ID.",
      });
    }

    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      await deleteLocalImages(uploadedImages);

      return res.status(404).json({
        success: false,
        message: "Banner not found.",
      });
    }

    const body = req.body;
    const errors = validateBanner(body, true);

    if (errors.length) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    const allowedFields = [
      "title",
      "subtitle",
      "mobileImage",
      "displayOrder",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        banner[field] = body[field];
      }
    }

    if (body.displayOrder !== undefined) {
      banner.displayOrder = Number(body.displayOrder);
    }

    if (body.isActive !== undefined) {
      banner.isActive =
        body.isActive === true || body.isActive === "true";
    }

    const oldImages = [...banner.image];
    const oldMobileImage = banner.mobileImage;

    // Only replace existing images when new files are uploaded.
    if (uploadedImages.length > 0) {
      banner.image = uploadedImages;
    }

    // Handle mobileImage file upload
    const uploadedMobileImage = getUploadedMobileImage(req);
    if (uploadedMobileImage) {
      banner.mobileImage = uploadedMobileImage;
    }

    await banner.save();

    if (uploadedImages.length > 0) {
      await deleteLocalImages(oldImages);
    }
    if (uploadedMobileImage && oldMobileImage) {
      await deleteLocalImages([oldMobileImage]);
    }

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully.",
      data: banner,
    });
  } catch (error) {
    await deleteLocalImages(uploadedImages);

    console.error("Update banner:", error.message);

    return res.status(400).json({
      success: false,
      message: "Unable to update banner.",
    });
  }
};

// ADMIN: Enable or disable a banner
const updateBannerStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID.",
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean.",
      });
    }

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: req.body.isActive } },
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner status updated successfully.",
      data: banner,
    });
  } catch (error) {
    console.error("Update banner status:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update banner status.",
    });
  }
};

// ADMIN: Reorder banners
const reorderBanners = async (req, res) => {
  try {
    const { banners } = req.body;

    if (!Array.isArray(banners) || banners.length === 0) {
      return res.status(400).json({
        success: false,
        message: "banners must be a non-empty array.",
      });
    }

    const ids = banners.map((item) => item.id);

    if (
      ids.some((id) => !mongoose.isValidObjectId(id)) ||
      new Set(ids).size !== ids.length ||
      banners.some(
        (item) =>
          !Number.isInteger(item.displayOrder) ||
          item.displayOrder < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Each banner needs a valid ID and displayOrder.",
      });
    }

    const existingCount = await Banner.countDocuments({
      _id: { $in: ids },
    });

    if (existingCount !== ids.length) {
      return res.status(404).json({
        success: false,
        message: "One or more banners were not found.",
      });
    }

    await Banner.bulkWrite(
      banners.map((item) => ({
        updateOne: {
          filter: { _id: item.id },
          update: { $set: { displayOrder: item.displayOrder } },
        },
      }))
    );

    return res.status(200).json({
      success: true,
      message: "Banner order updated successfully.",
    });
  } catch (error) {
    console.error("Reorder banners:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reorder banners.",
    });
  }
};

// ADMIN: Delete banner and its local images
const deleteBanner = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID.",
      });
    }

    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found.",
      });
    }

    await deleteLocalImages(banner.image);

    await banner.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully.",
    });
  } catch (error) {
    console.error("Delete banner:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete banner.",
    });
  }
};

module.exports = {
  getActiveBanners,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  updateBannerStatus,
  reorderBanners,
  deleteBanner,
};
