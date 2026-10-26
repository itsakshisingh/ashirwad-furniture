const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const Subcategory = require("../models/Subcategory");
const Category = require("../models/Category");

const uploadDir = path.join(process.cwd(), "uploads", "subcategories");

const getUploadedImages = (req) =>
  (req.files || []).map((file) => `/uploads/subcategories/${file.filename}`);

const deleteLocalImages = async (images = []) => {
  await Promise.allSettled(
    images.map(async (image) => {
      if (typeof image !== "string") return;

      const filename = path.basename(image);

      if (filename !== image.replace(/^.*\//, "")) return;

      await fs.unlink(path.join(uploadDir, filename));
    })
  );
};

const validateSubcategory = (data, partial = false) => {
  const errors = [];

  if (!partial && (typeof data.name !== "string" || !data.name.trim())) {
    errors.push("name is required.");
  }

  if (
    data.name !== undefined &&
    (typeof data.name !== "string" || data.name.length > 100)
  ) {
    errors.push("name must be a string of at most 100 characters.");
  }

  if (!partial && (typeof data.slug !== "string" || !data.slug.trim())) {
    errors.push("slug is required.");
  }

  if (
    data.slug !== undefined &&
    (typeof data.slug !== "string" || data.slug.length > 100)
  ) {
    errors.push("slug must be a string of at most 100 characters.");
  }

  if (
    data.description !== undefined &&
    (typeof data.description !== "string" || data.description.length > 1000)
  ) {
    errors.push("description must be a string of at most 1000 characters.");
  }

  if (!partial && !data.category) {
    errors.push("category is required.");
  }

  if (
    data.category !== undefined &&
    !mongoose.isValidObjectId(data.category)
  ) {
    errors.push("category must be a valid ObjectId.");
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


  return errors;
};

// PUBLIC: Get active subcategories
const getActiveSubcategories = async (req, res) => {
  try {
    const subcategories = await Subcategory.find({ isActive: true })
      .populate("category", "name slug")
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Subcategories fetched successfully.",
      count: subcategories.length,
      data: subcategories,
    });
  } catch (error) {
    console.error("Get active subcategories:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch subcategories.",
    });
  }
};

// PUBLIC: Get subcategories by category ID
const getSubcategoriesByCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const subcategories = await Subcategory.find({
      category: req.params.categoryId,
      isActive: true,
    })
      .populate("category", "name slug")
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: subcategories.length,
      data: subcategories,
    });
  } catch (error) {
    console.error("Get subcategories by category:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch subcategories.",
    });
  }
};

// PUBLIC: Get subcategory by slug
const getSubcategoryBySlug = async (req, res) => {
  try {
    const subcategory = await Subcategory.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate("category", "name slug");

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: subcategory,
    });
  } catch (error) {
    console.error("Get subcategory by slug:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch subcategory.",
    });
  }
};

// ADMIN: Get all subcategories
const getAllSubcategories = async (req, res) => {
  try {
    const subcategories = await Subcategory.find({})
      .populate("category", "name slug")
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: subcategories.length,
      data: subcategories,
    });
  } catch (error) {
    console.error("Get all subcategories:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch subcategories.",
    });
  }
};

// ADMIN: Get one subcategory
const getSubcategoryById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    const subcategory = await Subcategory.findById(req.params.id).populate(
      "category",
      "name slug"
    );

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: subcategory,
    });
  } catch (error) {
    console.error("Get subcategory:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch subcategory.",
    });
  }
};

// ADMIN: Create subcategory with multiple images
const createSubcategory = async (req, res) => {
  const uploadedImages = getUploadedImages(req);

  try {
    const body = req.body;
    const errors = validateSubcategory(body);

    if (errors.length) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    // Check if slug already exists
    const existingSubcategory = await Subcategory.findOne({
      slug: body.slug.trim().toLowerCase(),
    });
    if (existingSubcategory) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Subcategory with this slug already exists.",
      });
    }

    // Validate category exists
    const categoryExists = await Category.findById(body.category);
    if (!categoryExists) {
      await deleteLocalImages(uploadedImages);

      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const subcategory = await Subcategory.create({
      name: body.name.trim(),
      slug: body.slug.trim().toLowerCase(),
      description: body.description || "",
      images: uploadedImages,
      category: body.category,
      displayOrder: Number(body.displayOrder || 0),
      isActive:
        body.isActive === undefined
          ? true
          : body.isActive === true || body.isActive === "true",
    });

    const populatedSubcategory = await Subcategory.findById(
      subcategory._id
    ).populate("category", "name slug");

    return res.status(201).json({
      success: true,
      message: "Subcategory created successfully.",
      data: populatedSubcategory,
    });
  } catch (error) {
    await deleteLocalImages(uploadedImages);

    console.error("Create subcategory:", error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Subcategory with this slug already exists.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to create subcategory.",
    });
  }
};

// ADMIN: Update subcategory
const updateSubcategory = async (req, res) => {
  const uploadedImages = getUploadedImages(req);

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    const subcategory = await Subcategory.findById(req.params.id);

    if (!subcategory) {
      await deleteLocalImages(uploadedImages);

      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    const body = req.body;
    const errors = validateSubcategory(body, true);

    if (errors.length) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    // Check if slug is being changed and already exists
    if (body.slug && body.slug !== subcategory.slug) {
      const existingSubcategory = await Subcategory.findOne({
        slug: body.slug.trim().toLowerCase(),
        _id: { $ne: req.params.id },
      });

      if (existingSubcategory) {
        await deleteLocalImages(uploadedImages);

        return res.status(400).json({
          success: false,
          message: "Subcategory with this slug already exists.",
        });
      }
    }

    // Validate category if provided
    if (body.category) {
      const categoryExists = await Category.findById(body.category);
      if (!categoryExists) {
        await deleteLocalImages(uploadedImages);

        return res.status(404).json({
          success: false,
          message: "Category not found.",
        });
      }
    }

    const allowedFields = [
      "name",
      "slug",
      "description",
      "category",
      "displayOrder",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "slug") {
          subcategory[field] = body[field].trim().toLowerCase();
        } else {
          subcategory[field] = body[field];
        }
      }
    }

    if (body.displayOrder !== undefined) {
      subcategory.displayOrder = Number(body.displayOrder);
    }

    if (body.isActive !== undefined) {
      subcategory.isActive =
        body.isActive === true || body.isActive === "true";
    }

    const oldImages = [...subcategory.images];

    // Only replace existing images when new files are uploaded
    if (uploadedImages.length > 0) {
      subcategory.images = uploadedImages;
    }

    await subcategory.save();

    if (uploadedImages.length > 0) {
      await deleteLocalImages(oldImages);
    }

    const updatedSubcategory = await Subcategory.findById(
      subcategory._id
    ).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Subcategory updated successfully.",
      data: updatedSubcategory,
    });
  } catch (error) {
    await deleteLocalImages(uploadedImages);

    console.error("Update subcategory:", error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Subcategory with this slug already exists.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to update subcategory.",
    });
  }
};

// ADMIN: Update subcategory status
const updateSubcategoryStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean.",
      });
    }

    const subcategory = await Subcategory.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: req.body.isActive } },
      { new: true, runValidators: true }
    ).populate("category", "name slug");

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subcategory status updated successfully.",
      data: subcategory,
    });
  } catch (error) {
    console.error("Update subcategory status:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update subcategory status.",
    });
  }
};

// ADMIN: Reorder subcategories
const reorderSubcategories = async (req, res) => {
  try {
    const { subcategories } = req.body;

    if (!Array.isArray(subcategories) || subcategories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "subcategories must be a non-empty array.",
      });
    }

    const ids = subcategories.map((item) => item.id);

    if (
      ids.some((id) => !mongoose.isValidObjectId(id)) ||
      new Set(ids).size !== ids.length ||
      subcategories.some(
        (item) =>
          !Number.isInteger(item.displayOrder) || item.displayOrder < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Each subcategory needs a valid ID and displayOrder.",
      });
    }

    const existingCount = await Subcategory.countDocuments({
      _id: { $in: ids },
    });

    if (existingCount !== ids.length) {
      return res.status(404).json({
        success: false,
        message: "One or more subcategories were not found.",
      });
    }

    await Subcategory.bulkWrite(
      subcategories.map((item) => ({
        updateOne: {
          filter: { _id: item.id },
          update: { $set: { displayOrder: item.displayOrder } },
        },
      }))
    );

    return res.status(200).json({
      success: true,
      message: "Subcategory order updated successfully.",
    });
  } catch (error) {
    console.error("Reorder subcategories:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reorder subcategories.",
    });
  }
};

// ADMIN: Delete subcategory
const deleteSubcategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    const subcategory = await Subcategory.findById(req.params.id);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    await deleteLocalImages(subcategory.images);

    await subcategory.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully.",
    });
  } catch (error) {
    console.error("Delete subcategory:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete subcategory.",
    });
  }
};

module.exports = {
  getActiveSubcategories,
  getSubcategoriesByCategory,
  getSubcategoryBySlug,
  getAllSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  updateSubcategoryStatus,
  reorderSubcategories,
  deleteSubcategory,
};
