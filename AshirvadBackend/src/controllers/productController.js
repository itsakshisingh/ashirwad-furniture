const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");

const uploadDir = path.join(process.cwd(), "uploads", "products");

const getUploadedImages = (req) =>
  (req.files || []).map((file) => `/uploads/products/${file.filename}`);

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

const validateProduct = (data, partial = false) => {
  const errors = [];

  if (!partial && (typeof data.name !== "string" || !data.name.trim())) {
    errors.push("name is required.");
  }

  if (
    data.name !== undefined &&
    (typeof data.name !== "string" || data.name.length > 200)
  ) {
    errors.push("name must be a string of at most 200 characters.");
  }

  if (!partial && (typeof data.slug !== "string" || !data.slug.trim())) {
    errors.push("slug is required.");
  }

  if (!partial && (typeof data.sku !== "string" || !data.sku.trim())) {
    errors.push("sku is required.");
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
    data.subcategory !== undefined &&
    data.subcategory !== null &&
    data.subcategory !== "" &&
    !mongoose.isValidObjectId(data.subcategory)
  ) {
    errors.push("subcategory must be a valid ObjectId or null.");
  }

  if (!partial) {
    // price can arrive as a flat field OR nested inside a 'pricing' JSON string/object
    const pricingObj = data.pricing
      ? (typeof data.pricing === "string" ? (() => { try { return JSON.parse(data.pricing); } catch { return {}; } })() : data.pricing)
      : {};
    const resolvedPrice = data.price !== undefined ? data.price : pricingObj?.price;
    if (resolvedPrice === undefined || resolvedPrice === "" || resolvedPrice === null || isNaN(Number(resolvedPrice)) || Number(resolvedPrice) < 0) {
      errors.push("price is required and must be a non-negative number.");
    }
  }

  return errors;
};

// PUBLIC: Get active products with filters
const getActiveProducts = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      minPrice,
      maxPrice,
      isFeatured,
      isBestSeller,
      tags,
      search,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const query = { isActive: true };

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (isFeatured === "true") query.isFeatured = true;
    if (isBestSeller === "true") query.isBestSeller = true;
    if (tags) query.tags = { $in: tags.split(",") };

    if (minPrice || maxPrice) {
      query["pricing.price"] = {};
      if (minPrice) query["pricing.price"].$gte = Number(minPrice);
      if (maxPrice) query["pricing.price"].$lte = Number(maxPrice);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Product.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully.",
      count: products.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: products,
    });
  } catch (error) {
    console.error("Get active products:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch products.",
    });
  }
};

// PUBLIC: Get product by slug
const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    })
      .populate("category", "name slug")
      .populate("subcategory", "name slug");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product by slug:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product.",
    });
  }
};

// PUBLIC: Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const products = await Product.find({ isActive: true, isFeatured: true })
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get featured products:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch featured products.",
    });
  }
};

// ADMIN: Get all products
const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find({})
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Product.countDocuments({});

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: products,
    });
  } catch (error) {
    console.error("Get all products:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch products.",
    });
  }
};

// ADMIN: Get one product
const getProductById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(req.params.id)
      .populate("category", "name slug")
      .populate("subcategory", "name slug");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product.",
    });
  }
};

// ADMIN: Create product with multiple images
const createProduct = async (req, res) => {
  const uploadedImages = getUploadedImages(req);

  try {
    const body = req.body;
    const errors = validateProduct(body);

    if (errors.length) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    // Check if slug already exists
    const existingProduct = await Product.findOne({
      slug: body.slug.trim().toLowerCase(),
    });
    if (existingProduct) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Product with this slug already exists.",
      });
    }

    // Check if SKU already exists
    const existingSKU = await Product.findOne({
      sku: body.sku.trim().toUpperCase(),
    });
    if (existingSKU) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists.",
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

    // Validate subcategory if provided
    if (body.subcategory && body.subcategory !== "null" && body.subcategory !== "") {
      const subcategoryExists = await Subcategory.findById(body.subcategory);
      if (!subcategoryExists) {
        await deleteLocalImages(uploadedImages);

        return res.status(404).json({
          success: false,
          message: "Subcategory not found.",
        });
      }
    }

    // Parse JSON fields if they're strings
    const pricing = typeof body.pricing === "string" ? JSON.parse(body.pricing) : body.pricing || {};
    const inventory = typeof body.inventory === "string" ? JSON.parse(body.inventory) : body.inventory || {};
    const specifications = typeof body.specifications === "string" ? JSON.parse(body.specifications) : body.specifications || {};
    const variants = typeof body.variants === "string" ? JSON.parse(body.variants) : body.variants || [];
    const delivery = typeof body.delivery === "string" ? JSON.parse(body.delivery) : body.delivery || {};
    const tags = typeof body.tags === "string" ? JSON.parse(body.tags) : body.tags || [];
    const seo = typeof body.seo === "string" ? JSON.parse(body.seo) : body.seo || {};

    const product = await Product.create({
      name: body.name.trim(),
      slug: body.slug.trim().toLowerCase(),
      sku: body.sku.trim().toUpperCase(),
      shortDescription: body.shortDescription || "",
      description: body.description || "",
      category: body.category,
      subcategory:
        body.subcategory && body.subcategory !== "null" && body.subcategory !== ""
          ? body.subcategory
          : null,
      images: uploadedImages,
      thumbnail: body.thumbnail || (uploadedImages.length > 0 ? uploadedImages[0] : ""),
      pricing: {
        price: Number(body.price || pricing.price),
        salePrice: pricing.salePrice ? Number(pricing.salePrice) : null,
        currency: pricing.currency || "INR",
        taxPercentage: Number(pricing.taxPercentage || 0),
      },
      inventory: {
        stockQuantity: Number(inventory.stockQuantity || 0),
        lowStockThreshold: Number(inventory.lowStockThreshold || 5),
        stockStatus: inventory.stockStatus || "in_stock",
        allowBackorder: inventory.allowBackorder === true || inventory.allowBackorder === "true",
      },
      specifications,
      variants,
      delivery,
      tags,
      isFeatured: body.isFeatured === true || body.isFeatured === "true",
      isBestSeller: body.isBestSeller === true || body.isBestSeller === "true",
      isActive:
        body.isActive === undefined
          ? true
          : body.isActive === true || body.isActive === "true",
      displayOrder: Number(body.displayOrder || 0),
      seo,
    });

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name slug")
      .populate("subcategory", "name slug");

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: populatedProduct,
    });
  } catch (error) {
    await deleteLocalImages(uploadedImages);

    console.error("Create product:", error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Product with this slug or SKU already exists.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to create product.",
    });
  }
};

// ADMIN: Update product
const updateProduct = async (req, res) => {
  const uploadedImages = getUploadedImages(req);

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      await deleteLocalImages(uploadedImages);

      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const body = req.body;
    const errors = validateProduct(body, true);

    if (errors.length) {
      await deleteLocalImages(uploadedImages);

      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    // Check if slug is being changed and already exists
    if (body.slug && body.slug !== product.slug) {
      const existingProduct = await Product.findOne({
        slug: body.slug.trim().toLowerCase(),
        _id: { $ne: req.params.id },
      });

      if (existingProduct) {
        await deleteLocalImages(uploadedImages);

        return res.status(400).json({
          success: false,
          message: "Product with this slug already exists.",
        });
      }
    }

    // Check if SKU is being changed and already exists
    if (body.sku && body.sku !== product.sku) {
      const existingSKU = await Product.findOne({
        sku: body.sku.trim().toUpperCase(),
        _id: { $ne: req.params.id },
      });

      if (existingSKU) {
        await deleteLocalImages(uploadedImages);

        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists.",
        });
      }
    }

    // Update simple fields
    if (body.name) product.name = body.name.trim();
    if (body.slug) product.slug = body.slug.trim().toLowerCase();
    if (body.sku) product.sku = body.sku.trim().toUpperCase();
    if (body.shortDescription !== undefined) product.shortDescription = body.shortDescription;
    if (body.description !== undefined) product.description = body.description;
    if (body.category) product.category = body.category;
    if (body.subcategory !== undefined) {
      product.subcategory =
        body.subcategory && body.subcategory !== "null" && body.subcategory !== ""
          ? body.subcategory
          : null;
    }
    if (body.thumbnail !== undefined) product.thumbnail = body.thumbnail;

    // Update nested objects
    if (body.pricing) {
      const pricing = typeof body.pricing === "string" ? JSON.parse(body.pricing) : body.pricing;
      product.pricing = { ...product.pricing, ...pricing };
    }
    if (body.price) product.pricing.price = Number(body.price);

    if (body.inventory) {
      const inventory = typeof body.inventory === "string" ? JSON.parse(body.inventory) : body.inventory;
      product.inventory = { ...product.inventory, ...inventory };
    }

    if (body.specifications) {
      const specifications = typeof body.specifications === "string" ? JSON.parse(body.specifications) : body.specifications;
      product.specifications = { ...product.specifications, ...specifications };
    }

    if (body.variants) {
      product.variants = typeof body.variants === "string" ? JSON.parse(body.variants) : body.variants;
    }

    if (body.delivery) {
      const delivery = typeof body.delivery === "string" ? JSON.parse(body.delivery) : body.delivery;
      product.delivery = { ...product.delivery, ...delivery };
    }

    if (body.tags) {
      product.tags = typeof body.tags === "string" ? JSON.parse(body.tags) : body.tags;
    }

    if (body.seo) {
      const seo = typeof body.seo === "string" ? JSON.parse(body.seo) : body.seo;
      product.seo = { ...product.seo, ...seo };
    }

    if (body.isFeatured !== undefined) {
      product.isFeatured = body.isFeatured === true || body.isFeatured === "true";
    }

    if (body.isBestSeller !== undefined) {
      product.isBestSeller = body.isBestSeller === true || body.isBestSeller === "true";
    }

    if (body.isActive !== undefined) {
      product.isActive = body.isActive === true || body.isActive === "true";
    }

    if (body.displayOrder !== undefined) {
      product.displayOrder = Number(body.displayOrder);
    }

    const oldImages = [...product.images];

    // Only replace existing images when new files are uploaded
    if (uploadedImages.length > 0) {
      product.images = uploadedImages;
      if (!body.thumbnail) {
        product.thumbnail = uploadedImages[0];
      }
    }

    await product.save();

    if (uploadedImages.length > 0) {
      await deleteLocalImages(oldImages);
    }

    const updatedProduct = await Product.findById(product._id)
      .populate("category", "name slug")
      .populate("subcategory", "name slug");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: updatedProduct,
    });
  } catch (error) {
    await deleteLocalImages(uploadedImages);

    console.error("Update product:", error.message);

    return res.status(400).json({
      success: false,
      message: "Unable to update product.",
    });
  }
};

// ADMIN: Update product status
const updateProductStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean.",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: req.body.isActive } },
      { new: true, runValidators: true }
    )
      .populate("category", "name slug")
      .populate("subcategory", "name slug");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product status updated successfully.",
      data: product,
    });
  } catch (error) {
    console.error("Update product status:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update product status.",
    });
  }
};

// ADMIN: Delete product
const deleteProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    await deleteLocalImages(product.images);

    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("Delete product:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete product.",
    });
  }
};

module.exports = {
  getActiveProducts,
  getProductBySlug,
  getFeaturedProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
};
