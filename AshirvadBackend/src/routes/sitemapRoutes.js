const express = require("express");
const router = express.Router();
const { getSitemapXml } = require("../controllers/sitemapController");
const { getSitemapXsl } = require("../controllers/sitemapXslController");

// Dynamic XML sitemap endpoint
router.get("/sitemap.xml", getSitemapXml);
router.get("/sitemap.xsl", getSitemapXsl);
router.get("/", getSitemapXml);

module.exports = router;
