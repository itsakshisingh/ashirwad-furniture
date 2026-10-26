const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");

// Global search across products, categories, and subcategories
const globalSearch = async (req, res) => {
  try {
    const { q, type, limit = 10 } = req.query;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long.",
      });
    }

    const searchQuery = q.trim();
    const searchRegex = new RegExp(searchQuery, "i");
    const limitNum = Math.min(Number(limit), 50); // Max 50 results

    const results = {
      products: [],
      categories: [],
      subcategories: [],
    };

    // Search Products (if type is not specified or is 'products' or 'all')
    if (!type || type === "products" || type === "all") {
      results.products = await Product.find({
        isActive: true,
        $or: [
          { name: searchRegex },
          { shortDescription: searchRegex },
          { description: searchRegex },
          { sku: searchRegex },
          { tags: searchRegex },
          { "specifications.brand": searchRegex },
          { "specifications.material": searchRegex },
          { "specifications.color": searchRegex },
        ],
      })
        .populate("category", "name slug")
        .populate("subcategory", "name slug")
        .select(
          "name slug sku shortDescription images thumbnail pricing inventory isFeatured tags"
        )
        .sort({ isFeatured: -1, displayOrder: 1 })
        .limit(limitNum)
        .lean();
    }

    // Search Categories (if type is not specified or is 'categories' or 'all')
    if (!type || type === "categories" || type === "all") {
      results.categories = await Category.find({
        isActive: true,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { slug: searchRegex },
        ],
      })
        .select("name slug description image icon displayOrder")
        .sort({ displayOrder: 1 })
        .limit(limitNum)
        .lean();
    }

    // Search Subcategories (if type is not specified or is 'subcategories' or 'all')
    if (!type || type === "subcategories" || type === "all") {
      results.subcategories = await Subcategory.find({
        isActive: true,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { slug: searchRegex },
        ],
      })
        .populate("category", "name slug")
        .select("name slug description images category displayOrder")
        .sort({ displayOrder: 1 })
        .limit(limitNum)
        .lean();
    }

    const totalResults =
      results.products.length +
      results.categories.length +
      results.subcategories.length;

    return res.status(200).json({
      success: true,
      message: "Search completed successfully.",
      query: searchQuery,
      total: totalResults,
      data: results,
    });
  } catch (error) {
    console.error("Global search:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to perform search.",
    });
  }
};

// Search products only with advanced filters
const searchProducts = async (req, res) => {
  try {
    const {
      q,
      category,
      subcategory,
      minPrice,
      maxPrice,
      tags,
      brand,
      material,
      color,
      inStock,
      isFeatured,
      isBestSeller,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long.",
      });
    }

    const searchQuery = q.trim();
    const searchRegex = new RegExp(searchQuery, "i");

    const query = {
      isActive: true,
      $or: [
        { name: searchRegex },
        { shortDescription: searchRegex },
        { description: searchRegex },
        { sku: searchRegex },
        { tags: searchRegex },
        { "specifications.brand": searchRegex },
        { "specifications.material": searchRegex },
        { "specifications.color": searchRegex },
      ],
    };

    // Apply filters
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (isFeatured === "true") query.isFeatured = true;
    if (isBestSeller === "true") query.isBestSeller = true;
    if (tags) query.tags = { $in: tags.split(",") };
    if (brand) query["specifications.brand"] = new RegExp(brand, "i");
    if (material) query["specifications.material"] = new RegExp(material, "i");
    if (color) query["specifications.color"] = new RegExp(color, "i");

    if (inStock === "true") {
      query["inventory.stockStatus"] = "in_stock";
      query["inventory.stockQuantity"] = { $gt: 0 };
    }

    if (minPrice || maxPrice) {
      query["pricing.price"] = {};
      if (minPrice) query["pricing.price"].$gte = Number(minPrice);
      if (maxPrice) query["pricing.price"].$lte = Number(maxPrice);
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
      message: "Products search completed successfully.",
      query: searchQuery,
      count: products.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: products,
    });
  } catch (error) {
    console.error("Search products:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to search products.",
    });
  }
};

// Search suggestions (autocomplete)
const searchSuggestions = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long.",
      });
    }

    const searchQuery = q.trim();
    const searchRegex = new RegExp(`^${searchQuery}`, "i");
    const limitNum = Math.min(Number(limit), 20);

    // Get product name suggestions
    const productNames = await Product.find({
      isActive: true,
      name: searchRegex,
    })
      .select("name")
      .limit(limitNum)
      .lean();

    // Get category name suggestions
    const categoryNames = await Category.find({
      isActive: true,
      name: searchRegex,
    })
      .select("name")
      .limit(limitNum)
      .lean();

    // Get popular tags
    const tags = await Product.aggregate([
      { $match: { isActive: true, tags: searchRegex } },
      { $unwind: "$tags" },
      { $match: { tags: searchRegex } },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limitNum },
      { $project: { name: "$_id", _id: 0 } },
    ]);

    const suggestions = [
      ...productNames.map((p) => ({ type: "product", name: p.name })),
      ...categoryNames.map((c) => ({ type: "category", name: c.name })),
      ...tags.map((t) => ({ type: "tag", name: t.name })),
    ].slice(0, limitNum);

    return res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    console.error("Search suggestions:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch suggestions.",
    });
  }
};

// Get popular searches (trending)
const popularSearches = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 20);

    // Get most tagged items
    const popularTags = await Product.aggregate([
      { $match: { isActive: true } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { term: "$_id", count: 1, _id: 0 } },
    ]);

    // Get featured products
    const featuredProducts = await Product.find({
      isActive: true,
      isFeatured: true,
    })
      .select("name")
      .limit(5)
      .lean();

    const popularSearchTerms = [
      ...popularTags,
      ...featuredProducts.map((p) => ({ term: p.name, type: "featured" })),
    ].slice(0, limit);

    return res.status(200).json({
      success: true,
      count: popularSearchTerms.length,
      data: popularSearchTerms,
    });
  } catch (error) {
    console.error("Popular searches:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch popular searches.",
    });
  }
};

// Search by category
const searchByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { q, page = 1, limit = 20 } = req.query;

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const query = {
      isActive: true,
      category: categoryId,
    };

    if (q && q.trim().length >= 2) {
      const searchRegex = new RegExp(q.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { shortDescription: searchRegex },
        { tags: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Product.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: products,
    });
  } catch (error) {
    console.error("Search by category:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to search by category.",
    });
  }
};

module.exports = {
  globalSearch,
  searchProducts,
  searchSuggestions,
  popularSearches,
  searchByCategory,
};
