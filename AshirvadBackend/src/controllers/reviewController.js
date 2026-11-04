const Review = require("../models/Review");

const DEFAULT_STATS = [
  { value: "9,000+", label: "institutions served", description: "", displayOrder: 1, isActive: true },
  { value: "45", label: "school groups", description: "", displayOrder: 2, isActive: true },
  { value: "70 lakh+", label: "students have used Picano furniture", description: "", displayOrder: 3, isActive: true },
  { value: "2004", label: "since", description: "", displayOrder: 4, isActive: true },
  { value: "60", label: "groups", description: "", displayOrder: 5, isActive: true },
  { value: "4.5 lakh", label: "classrooms", description: "", displayOrder: 6, isActive: true },
  { value: "80", label: "machines", description: "", displayOrder: 7, isActive: true },
  { value: "4", label: "factories", description: "", displayOrder: 8, isActive: true },
];

/**
 * Public: Get all active reviews / stats
 * GET /api/v1/reviews or /api/v1/stats
 */
const getReviews = async (req, res) => {
  try {
    let count = await Review.countDocuments();
    if (count === 0) {
      // Auto seed default 8 metrics if collection is empty
      await Review.insertMany(DEFAULT_STATS);
    }

    const reviews = await Review.find({ isActive: true }).sort({
      displayOrder: 1,
      createdAt: 1,
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews/stats",
      error: error.message,
    });
  }
};

/**
 * Admin: Get all reviews / stats with pagination & filtering
 * GET /api/v1/reviews/admin/all
 */
const getAllReviewsAdmin = async (req, res) => {
  try {
    let totalCount = await Review.countDocuments();
    if (totalCount === 0) {
      await Review.insertMany(DEFAULT_STATS);
      totalCount = DEFAULT_STATS.length;
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.isActive !== undefined && req.query.isActive !== "") {
      filter.isActive = req.query.isActive === "true" || req.query.isActive === true;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [
        { value: searchRegex },
        { label: searchRegex },
        { description: searchRegex },
        { clientName: searchRegex },
      ];
    }

    const [reviews, count] = await Promise.all([
      Review.find(filter)
        .sort({ displayOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total: count,
      page,
      totalPages: Math.ceil(count / limit) || 1,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews/stats",
      error: error.message,
    });
  }
};

/**
 * Public/Admin: Get review by ID
 * GET /api/v1/reviews/:id
 */
const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review/Stat item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch item",
      error: error.message,
    });
  }
};

/**
 * Admin: Create review/stat item
 * POST /api/v1/reviews/admin
 */
const createReview = async (req, res) => {
  try {
    const {
      value,
      label,
      description,
      clientName,
      designation,
      rating,
      icon,
      image,
      displayOrder,
      isActive,
    } = req.body;

    if (!value || !label) {
      return res.status(400).json({
        success: false,
        message: "Both 'value' (e.g. 9,000+) and 'label' (e.g. institutions served) are required.",
      });
    }

    const review = await Review.create({
      value: String(value).trim(),
      label: String(label).trim(),
      description: description ? String(description).trim() : "",
      clientName: clientName ? String(clientName).trim() : "",
      designation: designation ? String(designation).trim() : "",
      rating: rating !== undefined ? Number(rating) : 5,
      icon: icon ? String(icon).trim() : "",
      image: image ? String(image).trim() : "",
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
      isActive: isActive !== undefined ? (isActive === true || isActive === "true") : true,
    });

    res.status(201).json({
      success: true,
      message: "Review/Stat item created successfully",
      data: review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create review/stat item",
      error: error.message,
    });
  }
};

/**
 * Admin: Update review/stat item
 * PUT / PATCH /api/v1/reviews/admin/:id
 */
const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review/Stat item not found",
      });
    }

    const allowedFields = [
      "value",
      "label",
      "description",
      "clientName",
      "designation",
      "rating",
      "icon",
      "image",
      "displayOrder",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "isActive") {
          review.isActive = req.body.isActive === true || req.body.isActive === "true";
        } else if (field === "displayOrder" || field === "rating") {
          review[field] = Number(req.body[field]);
        } else {
          review[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
        }
      }
    });

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review/Stat item updated successfully",
      data: review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update review/stat item",
      error: error.message,
    });
  }
};

/**
 * Admin: Update status (toggle visible)
 * PATCH /api/v1/reviews/admin/:id/status
 */
const updateReviewStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "'isActive' boolean is required in request body",
      });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isActive: isActive === true || isActive === "true" },
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review/Stat item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Item marked as ${review.isActive ? "active" : "inactive"}`,
      data: review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

/**
 * Admin: Delete item
 * DELETE /api/v1/reviews/admin/:id
 */
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review/Stat item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Review/Stat item deleted successfully",
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete item",
      error: error.message,
    });
  }
};

/**
 * Admin: Seed / Reset default items
 * POST /api/v1/reviews/admin/seed
 */
const seedReviews = async (req, res) => {
  try {
    const { overwrite } = req.body;
    if (overwrite) {
      await Review.deleteMany({});
    }
    const inserted = await Review.insertMany(DEFAULT_STATS);

    res.status(200).json({
      success: true,
      message: "Default stats/reviews seeded successfully",
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to seed default reviews/stats",
      error: error.message,
    });
  }
};

module.exports = {
  getReviews,
  getAllReviewsAdmin,
  getReviewById,
  createReview,
  updateReview,
  updateReviewStatus,
  deleteReview,
  seedReviews,
};

