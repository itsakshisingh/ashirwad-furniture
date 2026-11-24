const getSitemapXsl = (req, res) => {
  const xsl = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:furnex="https://www.ashirwadfurnex.com/schema/sitemap-ext"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>Dynamic XML Sitemap | Ashirwad Furnex</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style type="text/css">
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background-color: #f1f5f9;
            margin: 0;
            padding: 24px 16px;
          }
          .container {
            max-width: 1280px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
            padding: 36px 32px;
            border: 1px solid #e2e8f0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 24px;
            margin-bottom: 28px;
            flex-wrap: wrap;
            gap: 16px;
          }
          .title-area h1 {
            color: #0f172a;
            font-size: 28px;
            font-weight: 800;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .title-area p {
            color: #64748b;
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
            max-width: 780px;
          }
          .domain-badge {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            color: #334155;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 28px;
          }
          .stat-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 16px 20px;
            transition: transform 0.15s, box-shadow 0.15s;
          }
          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.06);
          }
          .stat-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #64748b;
          }
          .stat-val {
            font-size: 26px;
            font-weight: 800;
            color: #b45309;
            margin-top: 4px;
          }
          .filter-bar {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px 18px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
          }
          .filter-chips {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .chip {
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            color: #475569;
          }
          .table-wrapper {
            overflow-x: auto;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            background: #ffffff;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            text-align: left;
            padding: 14px 16px;
            font-weight: 700;
            border-bottom: 2px solid #e2e8f0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            white-space: nowrap;
          }
          td {
            padding: 14px 16px;
            border-bottom: 1px solid #f1f5f9;
            color: #1e293b;
            vertical-align: middle;
          }
          tr:hover td {
            background-color: #f8fafc;
          }
          .type-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            white-space: nowrap;
          }
          .type-product {
            background: #dbeafe;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
          }
          .type-category {
            background: #fef3c7;
            color: #b45309;
            border: 1px solid #fde68a;
          }
          .type-subcategory {
            background: #e0e7ff;
            color: #4338ca;
            border: 1px solid #c7d2fe;
          }
          .type-blog {
            background: #fce7f3;
            color: #be185d;
            border: 1px solid #fbcfe8;
          }
          .type-core {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
          }
          .item-name {
            font-weight: 700;
            color: #0f172a;
            font-size: 14px;
            margin-bottom: 3px;
          }
          .item-cat {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
          }
          a.loc-link {
            color: #0284c7;
            text-decoration: none;
            word-break: break-all;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          a.loc-link:hover {
            text-decoration: underline;
            color: #0369a1;
          }
          .priority-pill {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            background: #e2e8f0;
            color: #334155;
            font-family: ui-monospace, monospace;
          }
          .p-top { background: #dcfce7; color: #15803d; }
          .p-high { background: #fef3c7; color: #b45309; }
          .footer {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 12px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="title-area">
              <h1>🌐 Dynamic XML Sitemap</h1>
              <p>
                Real-time search engine sitemap dynamically synchronized with <strong>MongoDB Atlas</strong>.
                Click on any URL to directly open products, categories, subcategories, or blog articles on the live store.
              </p>
            </div>
            <div class="domain-badge">
              <span>🏠 Main Domain:</span>
              <strong style="color: #0284c7;">www.ashirwadfurnex.com</strong>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total URLs Indexed</div>
              <div class="stat-val"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Products (Direct Pages)</div>
              <div class="stat-val" style="color: #1d4ed8;">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url[furnex:type='Product' or furnex:type='Product Details'])"/>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Categories</div>
              <div class="stat-val" style="color: #b45309;">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url[furnex:type='Category'])"/>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Subcategories</div>
              <div class="stat-val" style="color: #4338ca;">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url[furnex:type='Subcategory'])"/>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Live Blogs</div>
              <div class="stat-val" style="color: #be185d;">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url[furnex:type='Blog'])"/>
              </div>
            </div>
          </div>

          <!-- Section Guide / Legend -->
          <div class="filter-bar">
            <span style="font-size: 13px; font-weight: 700; color: #334155;">Content Breakdown:</span>
            <div class="filter-chips">
              <span class="type-badge type-product">🛍️ Products</span>
              <span class="type-badge type-category">📁 Categories</span>
              <span class="type-badge type-subcategory">📂 Subcategories</span>
              <span class="type-badge type-blog">📝 Blogs</span>
              <span class="type-badge type-core">🌐 Core Pages</span>
            </div>
          </div>

          <!-- Main Table -->
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th style="width: 140px;">Content Type</th>
                  <th>Title / Name</th>
                  <th>Direct Live URL</th>
                  <th style="width: 90px; text-align: center;">Priority</th>
                  <th style="width: 110px;">Change Freq</th>
                  <th style="width: 120px;">Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td style="color: #94a3b8; font-weight: 600;">
                      <xsl:value-of select="position()"/>
                    </td>

                    <!-- Type Badge -->
                    <td>
                      <span>
                        <xsl:attribute name="class">
                          <xsl:choose>
                            <xsl:when test="furnex:type = 'Product'">type-badge type-product</xsl:when>
                            <xsl:when test="furnex:type = 'Category'">type-badge type-category</xsl:when>
                            <xsl:when test="furnex:type = 'Subcategory'">type-badge type-subcategory</xsl:when>
                            <xsl:when test="furnex:type = 'Blog'">type-badge type-blog</xsl:when>
                            <xsl:otherwise>type-badge type-core</xsl:otherwise>
                          </xsl:choose>
                        </xsl:attribute>
                        <xsl:choose>
                          <xsl:when test="furnex:type = 'Product' or furnex:type = 'Product Details'">🛍️ Product</xsl:when>
                          <xsl:when test="furnex:type = 'Category'">📁 Category</xsl:when>
                          <xsl:when test="furnex:type = 'Subcategory'">📂 Subcategory</xsl:when>
                          <xsl:when test="furnex:type = 'Blog'">📝 Blog</xsl:when>
                          <xsl:otherwise>🌐 Core Page</xsl:otherwise>
                        </xsl:choose>
                      </span>
                    </td>

                    <!-- Item Name & Category context -->
                    <td>
                      <div class="item-name">
                        <xsl:choose>
                          <xsl:when test="furnex:name != ''">
                            <xsl:value-of select="furnex:name"/>
                          </xsl:when>
                          <xsl:otherwise>
                            <xsl:value-of select="sitemap:loc"/>
                          </xsl:otherwise>
                        </xsl:choose>
                      </div>
                      <xsl:if test="furnex:category != ''">
                        <div class="item-cat">
                          📂 Category: <strong><xsl:value-of select="furnex:category"/></strong>
                        </div>
                      </xsl:if>
                    </td>

                    <!-- Clickable Link -->
                    <td>
                      <a class="loc-link" target="_blank">
                        <xsl:attribute name="href">
                          <xsl:value-of select="sitemap:loc"/>
                        </xsl:attribute>
                        <span><xsl:value-of select="sitemap:loc"/></span>
                        <span style="font-size: 11px;">↗</span>
                      </a>
                    </td>

                    <!-- Priority -->
                    <td style="text-align: center;">
                      <span>
                        <xsl:attribute name="class">
                          <xsl:choose>
                            <xsl:when test="sitemap:priority &gt;= 1.0">priority-pill p-top</xsl:when>
                            <xsl:when test="sitemap:priority &gt;= 0.8">priority-pill p-high</xsl:when>
                            <xsl:otherwise>priority-pill</xsl:otherwise>
                          </xsl:choose>
                        </xsl:attribute>
                        <xsl:value-of select="sitemap:priority"/>
                      </span>
                    </td>

                    <!-- Frequency -->
                    <td style="text-transform: capitalize; color: #64748b; font-size: 12px;">
                      <xsl:value-of select="sitemap:changefreq"/>
                    </td>

                    <!-- Last Modified -->
                    <td style="font-family: ui-monospace, monospace; font-size: 12px; color: #64748b; white-space: nowrap;">
                      <xsl:value-of select="sitemap:lastmod"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="footer">
            <span>Powered by <strong>Ashirwad Furnex Dynamic CMS</strong> • Direct MongoDB Atlas Synchronization</span>
            <span style="font-weight: 600; color: #16a34a;">✔ Search Engine Ready (Google / Bing / Yandex)</span>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;

  res.header("Content-Type", "text/xsl; charset=utf-8");
  res.header("Cache-Control", "public, max-age=86400");
  return res.status(200).send(xsl);
};

module.exports = {
  getSitemapXsl,
};
