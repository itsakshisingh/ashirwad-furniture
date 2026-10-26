const express = require("express");
const router = express.Router();

const {
  getAvailableFilters,
  getFiltersByCategory,
  getFiltersBySubcategory,
  getPriceRange,
  getMaterials,
  getColors,
  getBrands,
} = require("../controllers/filterController");

// All filter endpoints are public

// Get all available filters
router.get("/", getAvailableFilters);

// Get filters for a specific category
router.get("/category/:categoryId", getFiltersByCategory);

// Get filters for a specific subcategory
router.get("/subcategory/:subcategoryId", getFiltersBySubcategory);

// Get specific filter types
router.get("/price-range", getPriceRange);
router.get("/materials", getMaterials);
router.get("/colors", getColors);
router.get("/brands", getBrands);

module.exports = router;
