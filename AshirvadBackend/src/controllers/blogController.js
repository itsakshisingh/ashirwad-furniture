const Blog = require("../models/Blog");
const Media = require("../models/Media");
const path = require("path");

// Helper to generate slug
const slugify = (text = "") =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Helper to parse keywords and faqs from JSON string or Array
const parseField = (value, fallback = []) => {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback: split comma-separated strings for keywords
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return fallback;
};

/**
 * Auto-promote scheduled blogs whose scheduledAt time has arrived
 */
const publishDueScheduledBlogs = async () => {
  try {
    const now = new Date();
    await Blog.updateMany(
      {
        status: "scheduled",
        scheduledAt: { $lte: now },
      },
      {
        $set: {
          status: "published",
          publishedAt: now,
        },
      }
    );
  } catch (err) {
    console.error("Auto publish scheduled blogs error:", err.message);
  }
};

/**
 * Generate Google-compliant Schema.org JSON-LD structure for a blog post
 */
const generateBlogSchema = (blog) => {
  if (!blog) return null;
  const siteUrl = "https://ashirwadfurnex.com";
  const postSlug = blog.slug || "";
  const postUrl = `${siteUrl}/blogs/${postSlug}`;
  const coverUrl =
    blog.featuredImage?.url ||
    (typeof blog.featuredImage === "string" ? blog.featuredImage : `${siteUrl}/images/default-blog.png`);

  const publishedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toISOString()
    : blog.createdAt
    ? new Date(blog.createdAt).toISOString()
    : new Date().toISOString();

  const modifiedDate = blog.updatedAt
    ? new Date(blog.updatedAt).toISOString()
    : publishedDate;

  const schemaGraph = [
    {
      "@type": "BlogPosting",
      "@id": `${postUrl}#article`,
      isPartOf: {
        "@type": "WebPage",
        "@id": postUrl,
      },
      headline: blog.title || "",
      description: blog.metaDescription || blog.title || "",
      url: postUrl,
      image: coverUrl,
      datePublished: publishedDate,
      dateModified: modifiedDate,
      author: {
        "@type": "Person",
        name: blog.author || "Ashirwad Furnex Team",
      },
      publisher: {
        "@type": "Organization",
        name: "Ashirwad Furnex",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/logo.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": postUrl,
      },
    },
  ];

  if (Array.isArray(blog.faqs) && blog.faqs.length > 0 && blog.faqs[0].question) {
    schemaGraph.push({
      "@type": "FAQPage",
      "@id": `${postUrl}#faq`,
      mainEntity: blog.faqs
        .filter((faq) => faq.question && faq.answer)
        .map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": schemaGraph,
  };
};

/**
 * Public: Get published blogs (with pagination, category, isFeatured, search)
 * GET /api/v1/blogs
 */
const getBlogs = async (req, res) => {
  try {
    await publishDueScheduledBlogs();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { status: "published" },
        { status: "scheduled", scheduledAt: { $lte: new Date() } },
      ],
    };

    if (req.query.category && req.query.category !== "all") {
      filter.category = { $regex: new RegExp(`^${req.query.category.trim()}$`, "i") };
    }

    if (req.query.isFeatured !== undefined && req.query.isFeatured !== "") {
      filter.isFeatured = req.query.isFeatured === "true" || req.query.isFeatured === true;
    }

    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q.trim(), "i");
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { keywords: searchRegex },
      ];
    }

    const [blogs, count] = await Promise.all([
      Blog.find(filter)
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: blogs.length,
      total: count,
      page,
      totalPages: Math.ceil(count / limit) || 1,
      data: blogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blogs",
      error: error.message,
    });
  }
};

/**
 * Public: Get single blog by slug
 * GET /api/v1/blogs/slug/:slug
 */
const getBlogBySlug = async (req, res) => {
  try {
    await publishDueScheduledBlogs();

    const { slug } = req.params;
    const blog = await Blog.findOneAndUpdate(
      {
        slug: slug.toLowerCase().trim(),
        $or: [
          { status: "published" },
          { status: "scheduled", scheduledAt: { $lte: new Date() } },
        ],
      },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const blogObj = blog.toObject ? blog.toObject() : blog;
    const schema = generateBlogSchema(blogObj);

    res.status(200).json({
      success: true,
      data: {
        ...blogObj,
        schema,
        jsonLd: schema,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blog",
      error: error.message,
    });
  }
};

/**
 * Public: Get all distinct categories
 * GET /api/v1/blogs/categories
 */
const getBlogCategories = async (req, res) => {
  try {
    await publishDueScheduledBlogs();
    const categories = await Blog.distinct("category", {
      $or: [
        { status: "published" },
        { status: "scheduled", scheduledAt: { $lte: new Date() } },
      ],
    });
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories.filter(Boolean),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blog categories",
      error: error.message,
    });
  }
};

/**
 * Admin: Get all blogs with filters & pagination
 * GET /api/v1/blogs/admin/all
 */
const getAllBlogsAdmin = async (req, res) => {
  try {
    await publishDueScheduledBlogs();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    if (req.query.category && req.query.category !== "all") {
      filter.category = { $regex: new RegExp(`^${req.query.category.trim()}$`, "i") };
    }

    if (req.query.isFeatured !== undefined && req.query.isFeatured !== "") {
      filter.isFeatured = req.query.isFeatured === "true" || req.query.isFeatured === true;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [
        { title: searchRegex },
        { slug: searchRegex },
        { category: searchRegex },
        { author: searchRegex },
      ];
    }

    const [blogs, count] = await Promise.all([
      Blog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: blogs.length,
      total: count,
      page,
      totalPages: Math.ceil(count / limit) || 1,
      data: blogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blogs for admin",
      error: error.message,
    });
  }
};

/**
 * Public/Admin: Get blog by ID
 * GET /api/v1/blogs/:id
 */
const getBlogById = async (req, res) => {
  try {
    await publishDueScheduledBlogs();
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Verify publication visibility for public consumers (non-admin)
    const isAdmin = req.user && req.user.role === "admin";
    if (!isAdmin) {
      const isVisible =
        blog.status === "published" ||
        (blog.status === "scheduled" && blog.scheduledAt && new Date(blog.scheduledAt) <= new Date());
      if (!isVisible) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }
    }

    const blogObj = blog.toObject ? blog.toObject() : blog;
    const schema = generateBlogSchema(blogObj);

    res.status(200).json({
      success: true,
      data: {
        ...blogObj,
        schema,
        jsonLd: schema,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blog",
      error: error.message,
    });
  }
};

/**
 * Admin: Create a new blog
 * POST /api/v1/blogs/admin
 */
const createBlog = async (req, res) => {
  try {
    const {
      title,
      slug: customSlug,
      metaTitle,
      metaDescription,
      category,
      description,
      author,
      keywords,
      isFeatured,
      status,
      scheduledAt,
      featuredImage: bodyFeaturedImage,
      faqs,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Blog title is required",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Blog content/description is required",
      });
    }

    // Resolve slug
    let slug = slugify(customSlug || title);
    if (!slug) slug = `blog-${Date.now()}`;

    // Ensure unique slug
    let existing = await Blog.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // Handle featuredImage: uploaded file or string URL
    let featuredImage = "";
    if (req.file) {
      featuredImage = req.file.fileUrl || `/uploads/blogs/${req.file.filename}`;
    } else if (bodyFeaturedImage) {
      featuredImage = String(bodyFeaturedImage).trim();
    }

    // Determine status & schedule timestamps
    const now = new Date();
    const isScheduled = status === "scheduled";
    const parsedSchedule = scheduledAt ? new Date(scheduledAt) : null;
    const isPastSchedule = isScheduled && parsedSchedule && parsedSchedule <= now;

    let finalStatus = "published";
    if (status === "draft" || status === "archived") {
      finalStatus = status;
    } else if (isScheduled && !isPastSchedule) {
      finalStatus = "scheduled";
    }

    const blog = await Blog.create({
      title: title.trim(),
      slug,
      metaTitle: metaTitle ? metaTitle.trim() : title.trim(),
      metaDescription: metaDescription ? metaDescription.trim() : "",
      category: category ? category.trim() : "General",
      description: description.trim(),
      author: author ? author.trim() : "Admin",
      keywords: parseField(keywords),
      isFeatured: isFeatured === true || isFeatured === "true",
      status: finalStatus,
      scheduledAt: isScheduled ? parsedSchedule : null,
      publishedAt: finalStatus === "published" ? now : (isScheduled ? parsedSchedule : null),
      featuredImage,
      faqs: parseField(faqs),
    });

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create blog",
      error: error.message,
    });
  }
};

/**
 * Admin: Update blog
 * PUT / PATCH /api/v1/blogs/admin/:id
 */
const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const {
      title,
      slug: customSlug,
      metaTitle,
      metaDescription,
      category,
      description,
      author,
      keywords,
      isFeatured,
      status,
      scheduledAt,
      featuredImage: bodyFeaturedImage,
      faqs,
    } = req.body;

    if (title !== undefined) blog.title = title.trim();
    if (metaTitle !== undefined) blog.metaTitle = metaTitle.trim();
    if (metaDescription !== undefined) blog.metaDescription = metaDescription.trim();
    if (category !== undefined) blog.category = category.trim();
    if (description !== undefined) blog.description = description.trim();
    if (author !== undefined) blog.author = author.trim();

    if (keywords !== undefined) {
      blog.keywords = parseField(keywords);
    }

    if (faqs !== undefined) {
      blog.faqs = parseField(faqs);
    }

    if (isFeatured !== undefined) {
      blog.isFeatured = isFeatured === true || isFeatured === "true";
    }

    if (scheduledAt !== undefined) {
      blog.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    if (status !== undefined && ["draft", "published", "scheduled", "archived"].includes(status)) {
      const now = new Date();
      if (status === "scheduled") {
        const scheduleTime = scheduledAt ? new Date(scheduledAt) : blog.scheduledAt;
        if (scheduleTime && scheduleTime <= now) {
          blog.status = "published";
          blog.publishedAt = now;
        } else {
          blog.status = "scheduled";
          if (scheduledAt) blog.scheduledAt = new Date(scheduledAt);
        }
      } else if (status === "published") {
        blog.status = "published";
        blog.scheduledAt = null;
        if (!blog.publishedAt) blog.publishedAt = now;
      } else {
        blog.status = status;
      }
    }

    // Slug update with uniqueness check
    if (customSlug) {
      const newSlug = slugify(customSlug);
      if (newSlug && newSlug !== blog.slug) {
        const existing = await Blog.findOne({ slug: newSlug, _id: { $ne: blog._id } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Slug "${newSlug}" is already taken by another blog.`,
          });
        }
        blog.slug = newSlug;
      }
    }

    // Handle image replacement
    if (req.file) {
      // Delete old media from Mongo if exists
      if (blog.featuredImage) {
        const oldFilename = path.basename(blog.featuredImage);
        await Media.deleteOne({ filename: oldFilename }).catch(() => {});
      }
      blog.featuredImage = req.file.fileUrl || `/uploads/blogs/${req.file.filename}`;
    } else if (bodyFeaturedImage !== undefined) {
      blog.featuredImage = String(bodyFeaturedImage).trim();
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update blog",
      error: error.message,
    });
  }
};

/**
 * Admin: Update status
 * PATCH /api/v1/blogs/admin/:id/status
 */
const updateBlogStatus = async (req, res) => {
  try {
    const { status, scheduledAt } = req.body;
    if (!status || !["draft", "published", "scheduled", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status ('draft', 'published', 'scheduled', 'archived') is required",
      });
    }

    const now = new Date();
    const updateData = { status };
    if (status === "scheduled") {
      if (scheduledAt) {
        const scheduleTime = new Date(scheduledAt);
        if (scheduleTime <= now) {
          updateData.status = "published";
          updateData.publishedAt = now;
        } else {
          updateData.scheduledAt = scheduleTime;
        }
      }
    } else if (status === "published") {
      updateData.scheduledAt = null;
      updateData.publishedAt = now;
    }

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Blog status updated to ${status}`,
      data: blog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update blog status",
      error: error.message,
    });
  }
};

/**
 * Admin: Toggle featured
 * PATCH /api/v1/blogs/admin/:id/featured
 */
const toggleBlogFeatured = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    blog.isFeatured = !blog.isFeatured;
    await blog.save();

    res.status(200).json({
      success: true,
      message: `Blog is now ${blog.isFeatured ? "featured" : "unfeatured"}`,
      data: blog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to toggle featured status",
      error: error.message,
    });
  }
};

/**
 * Admin: Delete blog
 * DELETE /api/v1/blogs/admin/:id
 */
const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Clean up image from MongoDB if exists
    if (blog.featuredImage) {
      const filename = path.basename(blog.featuredImage);
      await Media.deleteOne({ filename }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete blog",
      error: error.message,
    });
  }
};

module.exports = {
  getBlogs,
  getBlogBySlug,
  getBlogCategories,
  getAllBlogsAdmin,
  getBlogById,
  createBlog,
  updateBlog,
  updateBlogStatus,
  toggleBlogFeatured,
  deleteBlog,
};
