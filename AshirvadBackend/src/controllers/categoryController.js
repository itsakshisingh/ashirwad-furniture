const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const Category = require("../models/Category");

const uploadDir = path.join(process.cwd(), "uploads", "categories");

const getUploadedImages = (req) =>
  (req.files || []).map((file) => `/uploads/categories/${file.filename}`);

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

const validateCategory = (data, partial = false) => {
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


  return errors;
};

// PUBLIC: Get active categories
const getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully.",
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Get active categories:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch categories.",
    });
  }
};

// PUBLIC: Get category by slug
const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Get category by slug:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch category.",
    });
  }
};

// ADMIN: Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({})
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Get all categories:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch categories.",
    });
  }
};

// ADMIN: Get one category
const getCategoryById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Get category:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch category.",
    });
  }
};

// ADMIN: Create category with multiple images
const createCategory = async (req, res) => {
  const uploadedImages = getUploadedImages(req);

  try {
    const body = req.body;
    const errors = validateCategory(body);

    if (errors.length) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug: body.slug.trim().toLowerCase() });
    if (existingCategory) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Category with this slug already exists.",
      });
    }

    const category = await Category.create({
      name: body.name.trim(),
      slug: body.slug.trim().toLowerCase(),
      description: body.description || "",
      image: uploadedImages,
      displayOrder: Number(body.displayOrder || 0),
      isActive:
        body.isActive === undefined
          ? true
          : body.isActive === true || body.isActive === "true",
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
  } catch (error) {
    await deleteLocalImages(uploadedImages);

    console.error("Create category:", error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category with this slug already exists.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to create category.",
    });
  }
};

// ADMIN: Update category
const updateCategory = async (req, res) => {
  const uploadedImages = getUploadedImages(req);

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      await deleteLocalImages(uploadedImages);

      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const body = req.body;
    const errors = validateCategory(body, true);

    if (errors.length) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    // Check if slug is being changed and already exists
    if (body.slug && body.slug !== category.slug) {
      const existingCategory = await Category.findOne({
        slug: body.slug.trim().toLowerCase(),
        _id: { $ne: req.params.id },
      });

      if (existingCategory) {
        await deleteLocalImages(uploadedImages);

        return res.status(400).json({
          success: false,
          message: "Category with this slug already exists.",
        });
      }
    }

    // Validate and update allowed fields
    const allowedFields = ["name", "slug", "description", "displayOrder", "isActive"];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "slug") {
          category[field] = body[field].trim().toLowerCase();
        } else {
          category[field] = body[field];
        }
      }
    }

    if (body.displayOrder !== undefined) {
      category.displayOrder = Number(body.displayOrder);
    }

    if (body.isActive !== undefined) {
      category.isActive = body.isActive === true || body.isActive === "true";
    }

    const oldImages = [...category.image];

    // Only replace existing images when new files are uploaded
    if (uploadedImages.length > 0) {
      category.image = uploadedImages;
    }

    await category.save();

    if (uploadedImages.length > 0) {
      await deleteLocalImages(oldImages);
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    await deleteLocalImages(uploadedImages);

    console.error("Update category:", error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category with this slug already exists.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to update category.",
    });
  }
};

// ADMIN: Update category status
const updateCategoryStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean.",
      });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: req.body.isActive } },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category status updated successfully.",
      data: category,
    });
  } catch (error) {
    console.error("Update category status:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update category status.",
    });
  }
};

// ADMIN: Reorder categories
const reorderCategories = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "categories must be a non-empty array.",
      });
    }

    const ids = categories.map((item) => item.id);

    if (
      ids.some((id) => !mongoose.isValidObjectId(id)) ||
      new Set(ids).size !== ids.length ||
      categories.some(
        (item) =>
          !Number.isInteger(item.displayOrder) || item.displayOrder < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Each category needs a valid ID and displayOrder.",
      });
    }

    const existingCount = await Category.countDocuments({
      _id: { $in: ids },
    });

    if (existingCount !== ids.length) {
      return res.status(404).json({
        success: false,
        message: "One or more categories were not found.",
      });
    }

    await Category.bulkWrite(
      categories.map((item) => ({
        updateOne: {
          filter: { _id: item.id },
          update: { $set: { displayOrder: item.displayOrder } },
        },
      }))
    );

    return res.status(200).json({
      success: true,
      message: "Category order updated successfully.",
    });
  } catch (error) {
    console.error("Reorder categories:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reorder categories.",
    });
  }
};

// ADMIN: Delete category
const deleteCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    await deleteLocalImages(category.image);

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    console.error("Delete category:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete category.",
    });
  }
};

module.exports = {
  getActiveCategories,
  getCategoryBySlug,
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  reorderCategories,
  deleteCategory,
};
