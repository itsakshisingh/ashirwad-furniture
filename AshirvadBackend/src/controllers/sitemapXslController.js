const getSitemapXsl = (req, res) => {
  const xsl = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap | Ashirwad Furnex</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background-color: #f8fafc;
            margin: 0;
            padding: 24px;
          }
          .container {
            max-width: 1100px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
            padding: 32px;
            border: 1px solid #e2e8f0;
          }
          .header {
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          h1 {
            color: #0f172a;
            font-size: 26px;
            font-weight: 800;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .desc {
            color: #64748b;
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
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
            border-radius: 12px;
            padding: 16px;
          }
          .stat-label {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
          }
          .stat-val {
            font-size: 24px;
            font-weight: 800;
            color: #9f7430;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 13px;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            text-align: left;
            padding: 12px 16px;
            font-weight: 700;
            border-bottom: 2px solid #e2e8f0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          td {
            padding: 12px 16px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
            vertical-align: middle;
          }
          tr:hover td {
            background-color: #fafaf9;
          }
          a {
            color: #0284c7;
            text-decoration: none;
            word-break: break-all;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
            color: #0369a1;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            background: #e2e8f0;
            color: #334155;
          }
          .badge-high {
            background: #fef3c7;
            color: #92400e;
          }
          .badge-top {
            background: #dcfce7;
            color: #166534;
          }
          .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #f1f5f9;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌐 Dynamic XML Sitemap</h1>
            <p class="desc">
              This dynamic XML sitemap is generated in real-time from <strong>MongoDB</strong> for search engines like Google and Bing.
              Whenever a product, blog, category, or subcategory is added, updated, or removed, this sitemap updates automatically.
            </p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total URLs Indexed</div>
              <div class="stat-val"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Generated Mode</div>
              <div class="stat-val" style="font-size: 18px; color: #166534;">Live MongoDB</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Status</div>
              <div class="stat-val" style="font-size: 18px; color: #0284c7;">Active &amp; Valid</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>URL / Location</th>
                <th style="width: 110px;">Priority</th>
                <th style="width: 120px;">Change Freq</th>
                <th style="width: 120px;">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td style="color: #94a3b8; font-weight: 600;"><xsl:value-of select="position()"/></td>
                  <td>
                    <a target="_blank">
                      <xsl:attribute name="href">
                        <xsl:value-of select="sitemap:loc"/>
                      </xsl:attribute>
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td>
                    <span>
                      <xsl:attribute name="class">
                        <xsl:choose>
                          <xsl:when test="sitemap:priority &gt;= 1.0">badge badge-top</xsl:when>
                          <xsl:when test="sitemap:priority &gt;= 0.8">badge badge-high</xsl:when>
                          <xsl:otherwise>badge</xsl:otherwise>
                        </xsl:choose>
                      </xsl:attribute>
                      <xsl:value-of select="sitemap:priority"/>
                    </span>
                  </td>
                  <td style="text-transform: capitalize; color: #64748b;">
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                  <td style="font-family: monospace; font-size: 12px; color: #64748b;">
                    <xsl:value-of select="sitemap:lastmod"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>

          <div class="footer">
            Generated dynamically by <strong>Ashirwad Furnex CMS</strong> • Real-time MongoDB synchronization
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
