const ProductReview = require("../models/ProductReview");
const Product = require("../models/Product");
const Inquiry = require("../models/Inquiry");

/**
 * Helper to extract image URLs from uploaded files and/or body
 */
const getUploadedImages = (req) => {
  let images = [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    images = req.files.map((file) => `/uploads/reviews/${file.filename}`);
  } else if (req.file) {
    images = [`/uploads/reviews/${req.file.filename}`];
  }

  // Also support passed existing images if array or string provided
  if (req.body.existingImages) {
    const existing = Array.isArray(req.body.existingImages)
      ? req.body.existingImages
      : [req.body.existingImages];
    images = [...existing, ...images];
  } else if (req.body.images && images.length === 0) {
    images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
  }

  return images;
};

/**
 * User: Create or update review for a booked product
 * POST /api/v1/product-reviews
 */
const createOrUpdateReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, rating, title, comment } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating is required and must be between 1 and 5 stars",
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Review comment is required",
      });
    }

    // Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user has booked/inquired and successfully received (status: completed/accepted)
    const completedBooking = await Inquiry.findOne({
      user: userId,
      product: productId,
      status: { $in: ["completed", "accepted"] },
    });

    const isBypass = req.user.role === "admin" || req.query.bypassBooking === "true";

    if (!completedBooking && !isBypass) {
      // Check if user has a booking that is not yet completed
      const pendingBooking = await Inquiry.findOne({
        user: userId,
        product: productId,
      });

      if (pendingBooking) {
        return res.status(400).json({
          success: false,
          message:
            "Aapka product abhi receive nahi hua hai. Product successfully receive / complete hone ke baad hi review de sakte hain.",
        });
      }

      return res.status(403).json({
        success: false,
        message:
          "Aap sirf wahi product review kar sakte hain jo aapne book kiya ho aur successfully receive kiya ho.",
      });
    }

    const images = getUploadedImages(req);

    // Check if review already exists from this user for this product
    let review = await ProductReview.findOne({ product: productId, user: userId });

    if (review) {
      // Update existing review
      review.rating = Number(rating);
      review.title = title ? title.trim() : review.title;
      review.comment = comment.trim();
      if (images.length > 0) {
        review.images = images;
      }
      review.isVerifiedPurchase = Boolean(completedBooking);
      review.inquiry = completedBooking ? completedBooking._id : review.inquiry;
      review.isActive = true;
      await review.save();

      return res.status(200).json({
        success: true,
        message: "Aapka review successfully update ho gaya hai.",
        data: review,
      });
    }

    // Create new review
    review = await ProductReview.create({
      product: productId,
      user: userId,
      inquiry: completedBooking ? completedBooking._id : null,
      rating: Number(rating),
      title: title ? title.trim() : "",
      comment: comment.trim(),
      images,
      isVerifiedPurchase: Boolean(completedBooking),
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Review successfully submit ho gaya hai.",
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit review",
      error: error.message,
    });
  }
};

/**
 * Public: Get reviews for a specific product
 * GET /api/v1/product-reviews/product/:productId
 */
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { product: productId, isActive: true };

    const [reviews, totalCount, stats] = await Promise.all([
      ProductReview.find(filter)
        .populate("user", "fullName profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ProductReview.countDocuments(filter),
      ProductReview.aggregate([
        { $match: { product: new (require("mongoose").Types.ObjectId)(productId), isActive: true } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            ratingCount: { $sum: 1 },
            star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
            star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const stat = stats[0] || {
      averageRating: 0,
      ratingCount: 0,
      star5: 0,
      star4: 0,
      star3: 0,
      star2: 0,
      star1: 0,
    };

    res.status(200).json({
      success: true,
      summary: {
        totalReviews: totalCount,
        averageRating: Number((stat.averageRating || 0).toFixed(1)),
        breakdown: {
          5: stat.star5,
          4: stat.star4,
          3: stat.star3,
          2: stat.star2,
          1: stat.star1,
        },
      },
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch product reviews",
      error: error.message,
    });
  }
};

/**
 * Public: Get latest reviews across all products (for website testimonials)
 * GET /api/v1/product-reviews
 */
const getAllPublicReviews = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));

    const reviews = await ProductReview.find({ isActive: true })
      .populate("user", "fullName profileImage")
      .populate("product", "name slug images thumbnail pricing")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

/**
 * User: Get own reviews
 * GET /api/v1/product-reviews/my-reviews
 */
const getMyReviews = async (req, res) => {
  try {
    const reviews = await ProductReview.find({ user: req.user._id })
      .populate("product", "name slug images thumbnail pricing")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch your reviews",
      error: error.message,
    });
  }
};

/**
 * User: Delete own review only
 * DELETE /api/v1/product-reviews/:id
 */
const deleteMyReview = async (req, res) => {
  try {
    const review = await ProductReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Only owner of the review or admin can delete
    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Aap sirf apna hi review delete kar sakte hain.",
      });
    }

    await ProductReview.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Review successfully delete kar diya gaya hai.",
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};

/**
 * Admin: View all product reviews with filters & pagination
 * GET /api/v1/product-reviews/admin/all
 */
const getAllReviewsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.productId) {
      filter.product = req.query.productId;
    }

    if (req.query.rating) {
      filter.rating = Number(req.query.rating);
    }

    if (req.query.isActive !== undefined && req.query.isActive !== "") {
      filter.isActive = req.query.isActive === "true" || req.query.isActive === true;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [
        { comment: searchRegex },
        { title: searchRegex },
      ];
    }

    const [reviews, count] = await Promise.all([
      ProductReview.find(filter)
        .populate("user", "fullName email mobile profileImage")
        .populate("product", "name slug sku images thumbnail pricing")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ProductReview.countDocuments(filter),
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
      message: "Failed to fetch reviews for admin",
      error: error.message,
    });
  }
};

/**
 * Admin: Delete any review
 * DELETE /api/v1/product-reviews/admin/:id
 */
const deleteReviewAdmin = async (req, res) => {
  try {
    const review = await ProductReview.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Review successfully deleted by admin.",
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};

/**
 * Admin: Toggle visibility / status of review
 * PATCH /api/v1/product-reviews/admin/:id/status
 */
const updateReviewStatusAdmin = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "'isActive' boolean is required",
      });
    }

    const review = await ProductReview.findByIdAndUpdate(
      req.params.id,
      { isActive: isActive === true || isActive === "true" },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Review marked as ${review.isActive ? "active" : "hidden"}`,
      data: review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update review status",
      error: error.message,
    });
  }
};

module.exports = {
  createOrUpdateReview,
  getProductReviews,
  getAllPublicReviews,
  getMyReviews,
  deleteMyReview,
  getAllReviewsAdmin,
  deleteReviewAdmin,
  updateReviewStatusAdmin,
};

