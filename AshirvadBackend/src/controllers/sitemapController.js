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
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
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
 * GET /sitemap.xml
 *
 * URL Structure:
 *  - Product Detail Page: https://www.ashirwadfurnex.com/products/:productId
 *    (Directly opens the Product Details view with image, specs, and Get Best Quote button)
 *  - Categories Listing:  https://www.ashirwadfurnex.com/products?categoryId=:catId
 *  - Subcategories:       https://www.ashirwadfurnex.com/products?categoryId=:catId&subCategoryId=:subCatId
 *  - Blogs:               https://www.ashirwadfurnex.com/blogs/:slug
 *  - Core Static Pages:   /, /products, /catalog/categories, /blogs, /about-ashirwad, etc.
 */
const getSitemapXml = async (req, res) => {
  try {
    const baseUrl = (process.env.SITE_URL || "https://www.ashirwadfurnex.com").replace(/\/$/, "");

    // 1. Static Core Pages (matches Expo Router screen paths)
    const staticPages = [
      { url: `${baseUrl}/`, priority: "1.0", changefreq: "daily", type: "Core Page", title: "Home" },
      { url: `${baseUrl}/products`, priority: "0.9", changefreq: "daily", type: "Core Page", title: "All Products & Catalog" },
      { url: `${baseUrl}/catalog/categories`, priority: "0.8", changefreq: "weekly", type: "Core Page", title: "Catalog Categories" },
      { url: `${baseUrl}/about-ashirwad`, priority: "0.8", changefreq: "monthly", type: "Core Page", title: "About Ashirwad Furnex" },
      { url: `${baseUrl}/projects`, priority: "0.7", changefreq: "weekly", type: "Core Page", title: "Projects" },
      { url: `${baseUrl}/our-happy-customers`, priority: "0.7", changefreq: "weekly", type: "Core Page", title: "Our Clients" },
      { url: `${baseUrl}/company-certifications`, priority: "0.7", changefreq: "monthly", type: "Core Page", title: "Certifications" },
      { url: `${baseUrl}/quote`, priority: "0.8", changefreq: "weekly", type: "Core Page", title: "Request a Quote" },
      { url: `${baseUrl}/search`, priority: "0.6", changefreq: "weekly", type: "Core Page", title: "Search Products" },
    ];

    // 2. Fetch data from MongoDB in parallel
    const [blogs, products, categories, subcategories] = await Promise.all([
      Blog.find(
        {
          $or: [
            { status: "published" },
            { status: "scheduled", scheduledAt: { $lte: new Date() } },
          ],
        },
        "title slug updatedAt createdAt"
      )
        .sort({ updatedAt: -1 })
        .lean(),

      Product.find({}, "name sku slug updatedAt createdAt _id category subcategory")
        .populate("category", "name")
        .populate("subcategory", "name")
        .sort({ updatedAt: -1 })
        .lean(),

      Category.find({}, "name slug updatedAt createdAt _id")
        .sort({ displayOrder: 1, updatedAt: -1 })
        .lean(),

      Subcategory.find({}, "name slug updatedAt createdAt _id category")
        .sort({ displayOrder: 1, updatedAt: -1 })
        .lean(),
    ]);

    // 3. Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
    xml += `        xmlns:furnex="https://www.ashirwadfurnex.com/schema/sitemap-ext"\n`;
    xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
    xml += `        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;

    const now = formatDate(new Date());

    // --- Static Core Pages ---
    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(page.url)}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `    <furnex:type>${escapeXml(page.type)}</furnex:type>\n`;
      xml += `    <furnex:name>${escapeXml(page.title)}</furnex:name>\n`;
      xml += `  </url>\n`;
    }

    // --- Individual Products (Direct Product Details Page): /products/:productId ---
    for (const p of products) {
      const prodId = String(p._id);
      const lastmod = formatDate(p.updatedAt || p.createdAt);
      const url = `${baseUrl}/products/${prodId}`;
      const catName = p.category?.name || "Product";
      const displayName = p.sku ? `${p.name} (${p.sku})` : p.name;

      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(url)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `    <furnex:type>Product</furnex:type>\n`;
      xml += `    <furnex:name>${escapeXml(displayName)}</furnex:name>\n`;
      xml += `    <furnex:category>${escapeXml(catName)}</furnex:category>\n`;
      xml += `  </url>\n`;
    }

    // --- Categories: /products?categoryId=:catId ---
    for (const c of categories) {
      const catId = String(c._id);
      const lastmod = formatDate(c.updatedAt || c.createdAt);
      const url = `${baseUrl}/products?categoryId=${catId}`;
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(url)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `    <furnex:type>Category</furnex:type>\n`;
      xml += `    <furnex:name>${escapeXml(c.name)}</furnex:name>\n`;
      xml += `  </url>\n`;
    }

    // --- Subcategories: /products?categoryId=:catId&subCategoryId=:subCatId ---
    for (const sc of subcategories) {
      const subCatId = String(sc._id);
      const catId = sc.category ? String(sc.category) : null;
      if (!catId) continue;
      const lastmod = formatDate(sc.updatedAt || sc.createdAt);
      const url = `${baseUrl}/products?categoryId=${catId}&subCategoryId=${subCatId}`;
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(url)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `    <furnex:type>Subcategory</furnex:type>\n`;
      xml += `    <furnex:name>${escapeXml(sc.name)}</furnex:name>\n`;
      xml += `  </url>\n`;
    }

    // --- Blogs: Main Listing Page & Individual Posts ---
    // 1. All Blogs Listing Page (Jahan par saare blogs ek saath dikhte hain)
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}/blogs`)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    xml += `    <furnex:type>Blog</furnex:type>\n`;
    xml += `    <furnex:name>All Blogs (Furniture Blog Listing)</furnex:name>\n`;
    xml += `  </url>\n`;

    // 2. Individual Published Blog Pages
    for (const b of blogs) {
      const identifier = (b.slug || String(b._id || "")).trim();
      if (!identifier) continue;
      const lastmod = formatDate(b.updatedAt || b.createdAt);
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${baseUrl}/blogs/${identifier}`)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `    <furnex:type>Blog</furnex:type>\n`;
      xml += `    <furnex:name>${escapeXml(b.title)}</furnex:name>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml; charset=utf-8");
    res.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.header("Access-Control-Allow-Origin", "*");
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
