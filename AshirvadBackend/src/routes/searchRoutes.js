const express = require("express");
const router = express.Router();

const {
  globalSearch,
  searchProducts,
  searchSuggestions,
  popularSearches,
  searchByCategory,
} = require("../controllers/searchController");

// All search endpoints are public

// Global search across all entities
router.get("/", globalSearch);

// Search products with advanced filters
router.get("/products", searchProducts);

// Search suggestions for autocomplete
router.get("/suggestions", searchSuggestions);

// Popular/trending searches
router.get("/popular", popularSearches);

// Search within a specific category
router.get("/category/:categoryId", searchByCategory);

module.exports = router;
