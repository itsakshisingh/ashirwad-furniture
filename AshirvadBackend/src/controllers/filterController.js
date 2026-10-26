const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");

// Get all available filters from active products
const getAvailableFilters = async (req, res) => {
  try {
    const filters = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $facet: {
          materials: [
            { $group: { _id: "$specifications.material", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1 } },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
          colors: [
            { $group: { _id: "$specifications.color", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1 } },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
          brands: [
            { $group: { _id: "$specifications.brand", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1 } },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
          priceRange: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$pricing.price" },
                maxPrice: { $max: "$pricing.price" },
              },
            },
          ],
          categories: [
            { $group: { _id: "$category", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "categoryInfo",
              },
            },
            { $unwind: "$categoryInfo" },
            {
              $project: {
                value: "$_id",
                label: "$categoryInfo.name",
                slug: "$categoryInfo.slug",
                count: 1,
                _id: 0,
              },
            },
            { $sort: { count: -1 } },
          ],
          subcategories: [
            { $match: { subcategory: { $ne: null } } },
            { $group: { _id: "$subcategory", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "subcategories",
                localField: "_id",
                foreignField: "_id",
                as: "subcategoryInfo",
              },
            },
            { $unwind: "$subcategoryInfo" },
            {
              $project: {
                value: "$_id",
                label: "$subcategoryInfo.name",
                slug: "$subcategoryInfo.slug",
                category: "$subcategoryInfo.category",
                count: 1,
                _id: 0,
              },
            },
            { $sort: { count: -1 } },
          ],
          tags: [
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
          stockStatus: [
            {
              $group: {
                _id: "$inventory.stockStatus",
                count: { $sum: 1 },
              },
            },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
        },
      },
    ]);

    const result = filters[0];

    return res.status(200).json({
      success: true,
      message: "Filters fetched successfully.",
      data: {
        materials: result.materials || [],
        colors: result.colors || [],
        brands: result.brands || [],
        priceRange: result.priceRange[0] || { minPrice: 0, maxPrice: 0 },
        categories: result.categories || [],
        subcategories: result.subcategories || [],
        tags: result.tags || [],
        stockStatus: result.stockStatus || [],
      },
    });
  } catch (error) {
    console.error("Get available filters:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch filters.",
    });
  }
};

// Get filters for a specific category
const getFiltersByCategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
    }

    const categoryId = req.params.categoryId;

    const filters = await Product.aggregate([
      { $match: { isActive: true, category: new mongoose.Types.ObjectId(categoryId) } },
      {
        $facet: {
          materials: [
            { $group: { _id: "$specifications.material", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1 } },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
          colors: [
            { $group: { _id: "$specifications.color", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1 } },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
          brands: [
            { $group: { _id: "$specifications.brand", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1 } },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
          priceRange: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$pricing.price" },
                maxPrice: { $max: "$pricing.price" },
              },
            },
          ],
          subcategories: [
            { $match: { subcategory: { $ne: null } } },
            { $group: { _id: "$subcategory", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "subcategories",
                localField: "_id",
                foreignField: "_id",
                as: "subcategoryInfo",
              },
            },
            { $unwind: "$subcategoryInfo" },
            {
              $project: {
                value: "$_id",
                label: "$subcategoryInfo.name",
                slug: "$subcategoryInfo.slug",
                count: 1,
                _id: 0,
              },
            },
            { $sort: { count: -1 } },
          ],
          tags: [
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
        },
      },
    ]);

    const result = filters[0];

    // Get category info
    const category = await Category.findById(categoryId).select("name slug");

    return res.status(200).json({
      success: true,
      message: "Category filters fetched successfully.",
      category: category || null,
      data: {
        materials: result.materials || [],
        colors: result.colors || [],
        brands: result.brands || [],
        priceRange: result.priceRange[0] || { minPrice: 0, maxPrice: 0 },
        subcategories: result.subcategories || [],
        tags: result.tags || [],
      },
    });
  } catch (error) {
    console.error("Get filters by category:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch category filters.",
    });
  }
};

// Get filters for a specific subcategory
const getFiltersBySubcategory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.subcategoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    const subcategoryId = req.params.subcategoryId;

    const filters = await Product.aggregate([
      { $match: { isActive: true, subcategory: new mongoose.Types.ObjectId(subcategoryId) } },
      {
        $facet: {
          materials: [
            { $group: { _id: "$specifications.material", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1 } },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
          colors: [
            { $group: { _id: "$specifications.color", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1 } },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
          brands: [
            { $group: { _id: "$specifications.brand", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1 } },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
          priceRange: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$pricing.price" },
                maxPrice: { $max: "$pricing.price" },
              },
            },
          ],
          tags: [
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 },
            { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
          ],
        },
      },
    ]);

    const result = filters[0];

    // Get subcategory info
    const subcategory = await Subcategory.findById(subcategoryId)
      .populate("category", "name slug")
      .select("name slug category");

    return res.status(200).json({
      success: true,
      message: "Subcategory filters fetched successfully.",
      subcategory: subcategory || null,
      data: {
        materials: result.materials || [],
        colors: result.colors || [],
        brands: result.brands || [],
        priceRange: result.priceRange[0] || { minPrice: 0, maxPrice: 0 },
        tags: result.tags || [],
      },
    });
  } catch (error) {
    console.error("Get filters by subcategory:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch subcategory filters.",
    });
  }
};

// Get price range
const getPriceRange = async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    const matchQuery = { isActive: true };
    if (category && mongoose.isValidObjectId(category)) {
      matchQuery.category = new mongoose.Types.ObjectId(category);
    }
    if (subcategory && mongoose.isValidObjectId(subcategory)) {
      matchQuery.subcategory = new mongoose.Types.ObjectId(subcategory);
    }

    const priceRange = await Product.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$pricing.price" },
          maxPrice: { $max: "$pricing.price" },
          avgPrice: { $avg: "$pricing.price" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: priceRange[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
    });
  } catch (error) {
    console.error("Get price range:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch price range.",
    });
  }
};

// Get all available materials
const getMaterials = async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    const matchQuery = { isActive: true };
    if (category && mongoose.isValidObjectId(category)) {
      matchQuery.category = new mongoose.Types.ObjectId(category);
    }
    if (subcategory && mongoose.isValidObjectId(subcategory)) {
      matchQuery.subcategory = new mongoose.Types.ObjectId(subcategory);
    }

    const materials = await Product.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$specifications.material", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { count: -1 } },
      { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
    ]);

    return res.status(200).json({
      success: true,
      count: materials.length,
      data: materials,
    });
  } catch (error) {
    console.error("Get materials:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch materials.",
    });
  }
};

// Get all available colors
const getColors = async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    const matchQuery = { isActive: true };
    if (category && mongoose.isValidObjectId(category)) {
      matchQuery.category = new mongoose.Types.ObjectId(category);
    }
    if (subcategory && mongoose.isValidObjectId(subcategory)) {
      matchQuery.subcategory = new mongoose.Types.ObjectId(subcategory);
    }

    const colors = await Product.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$specifications.color", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { count: -1 } },
      { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
    ]);

    return res.status(200).json({
      success: true,
      count: colors.length,
      data: colors,
    });
  } catch (error) {
    console.error("Get colors:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch colors.",
    });
  }
};

// Get all available brands
const getBrands = async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    const matchQuery = { isActive: true };
    if (category && mongoose.isValidObjectId(category)) {
      matchQuery.category = new mongoose.Types.ObjectId(category);
    }
    if (subcategory && mongoose.isValidObjectId(subcategory)) {
      matchQuery.subcategory = new mongoose.Types.ObjectId(subcategory);
    }

    const brands = await Product.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$specifications.brand", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { count: -1 } },
      { $project: { value: "$_id", label: "$_id", count: 1, _id: 0 } },
    ]);

    return res.status(200).json({
      success: true,
      count: brands.length,
      data: brands,
    });
  } catch (error) {
    console.error("Get brands:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch brands.",
    });
  }
};

module.exports = {
  getAvailableFilters,
  getFiltersByCategory,
  getFiltersBySubcategory,
  getPriceRange,
  getMaterials,
  getColors,
  getBrands,
};
