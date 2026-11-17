const Blog = require("../models/Blog");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");

/**
 * Helper to escape special XML characters
 */
const escapeXml = (unsafe = "") => {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
};

/**
 * Format Date to W3C Datetime / ISO string (YYYY-MM-DD)
 */
const formatDate = (date) => {
  if (!date) return new Date().toISOString().split("T")[0];
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

/**
 * Generate Dynamic Sitemap XML from MongoDB Atlas collections
 * GET /sitemap.xml or GET /api/v1/sitemap.xml
 */
const getSitemapXml = async (req, res) => {
  try {
    // Determine base domain (from env or request origin/host)
    const host = req.get("host");
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const defaultOrigin = process.env.SITE_URL || process.env.CLIENT_URL || `${protocol}://${host}`;
    const baseUrl = defaultOrigin.replace(/\/$/, "");

    // 1. Static Core Pages
    const staticPages = [
      { url: `${baseUrl}/`, priority: "1.0", changefreq: "daily" },
      { url: `${baseUrl}/about`, priority: "0.8", changefreq: "monthly" },
      { url: `${baseUrl}/products`, priority: "0.9", changefreq: "daily" },
      { url: `${baseUrl}/categories`, priority: "0.8", changefreq: "weekly" },
      { url: `${baseUrl}/blogs`, priority: "0.9", changefreq: "daily" },
      { url: `${baseUrl}/gallery`, priority: "0.7", changefreq: "weekly" },
      { url: `${baseUrl}/reviews`, priority: "0.6", changefreq: "weekly" },
      { url: `${baseUrl}/contact`, priority: "0.8", changefreq: "monthly" },
    ];

    // 2. Fetch Active Data in parallel from MongoDB
    const [blogs, products, categories, subcategories] = await Promise.all([
      // Only published blogs
      Blog.find({ status: "published" }, "slug updatedAt createdAt")
        .sort({ updatedAt: -1 })
        .lean(),

      // Only active products
      Product.find({ isActive: { $ne: false } }, "slug updatedAt createdAt")
        .sort({ updatedAt: -1 })
        .lean(),

      // Only active categories
      Category.find({ isActive: { $ne: false } }, "slug updatedAt createdAt")
        .sort({ displayOrder: 1, updatedAt: -1 })
        .lean(),

      // Only active subcategories
      Subcategory.find({ isActive: { $ne: false } }, "slug updatedAt createdAt")
        .sort({ displayOrder: 1, updatedAt: -1 })
        .lean(),
    ]);

    // Build XML string with XSL stylesheet for beautiful UI styling in browsers
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<?xml-stylesheet type="text/xsl" href="${baseUrl}/sitemap.xsl"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
    xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
    xml += `        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;

    const now = formatDate(new Date());

    // Append Static Pages
    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(page.url)}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Append Blogs: /blog/:slug (or /blogs/:slug)
    for (const b of blogs) {
      if (!b.slug) continue;
      const lastmod = formatDate(b.updatedAt || b.createdAt);
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${baseUrl}/blog/${b.slug}`)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // Append Products: /product/:slug (or /products/:slug)
    for (const p of products) {
      if (!p.slug) continue;
      const lastmod = formatDate(p.updatedAt || p.createdAt);
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${baseUrl}/product/${p.slug}`)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // Append Categories: /category/:slug
    for (const c of categories) {
      if (!c.slug) continue;
      const lastmod = formatDate(c.updatedAt || c.createdAt);
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${baseUrl}/category/${c.slug}`)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // Append Subcategories: /subcategory/:slug
    for (const sc of subcategories) {
      if (!sc.slug) continue;
      const lastmod = formatDate(sc.updatedAt || sc.createdAt);
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${baseUrl}/subcategory/${sc.slug}`)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml; charset=utf-8");
    res.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.status(200).send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate dynamic sitemap",
      error: error.message,
    });
  }
};

module.exports = {
  getSitemapXml,
};
