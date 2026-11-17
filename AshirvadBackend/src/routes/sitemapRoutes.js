const express = require("express");
const router = express.Router();
const { getSitemapXml } = require("../controllers/sitemapController");

// Dynamic XML sitemap endpoint
router.get("/sitemap.xml", getSitemapXml);
router.get("/", getSitemapXml);

module.exports = router;
