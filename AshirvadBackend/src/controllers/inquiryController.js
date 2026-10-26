const mongoose = require("mongoose");
const Inquiry = require("../models/Inquiry");
const Product = require("../models/Product");

const validateInquiry = (data) => {
  const errors = [];

  // Only product is required
  if (!data.product || !mongoose.isValidObjectId(data.product)) {
    errors.push("product must be a valid product ID.");
  }

  // Optional validations if fields are provided
  if (
    data.customerName &&
    (typeof data.customerName !== "string" || data.customerName.length > 100)
  ) {
    errors.push("customerName must be at most 100 characters.");
  }

  if (
    data.customerEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)
  ) {
    errors.push("customerEmail must be a valid email address.");
  }

  if (data.quantity !== undefined) {
    const qty = Number(data.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      errors.push("quantity must be a positive integer.");
    }
  }

  if (
    data.message &&
    (typeof data.message !== "string" || data.message.length > 1000)
  ) {
    errors.push("message must be at most 1000 characters.");
  }

  return errors;
};

// PUBLIC: Create inquiry
const createInquiry = async (req, res) => {
  try {
    const body = req.body;
    
    // If user is logged in, auto-fill their details
    let userData = {};
    if (req.user) {
      const fullAddress = req.user.address 
        ? `${req.user.address.addressLine1 || ''} ${req.user.address.addressLine2 || ''} ${req.user.address.city || ''} ${req.user.address.state || ''} ${req.user.address.pincode || ''}`.trim()
        : '';
      
      userData = {
        user: req.user._id,
        customerName: req.user.fullName || "",
        customerEmail: req.user.email || "",
        customerPhone: req.user.mobile || "",
        customerAddress: fullAddress || "",
      };
    } else {
      // Guest user - use provided details or empty strings
      userData = {
        user: null,
        customerName: body.customerName || "",
        customerEmail: body.customerEmail || "",
        customerPhone: body.customerPhone || "",
        customerAddress: body.customerAddress || "",
      };
    }

    // Merge user data with body data (body can override auto-filled data)
    const inquiryData = { 
      ...userData,
      product: body.product,
      ...(body.customerName && { customerName: body.customerName }),
      ...(body.customerEmail && { customerEmail: body.customerEmail }),
      ...(body.customerPhone && { customerPhone: body.customerPhone }),
      ...(body.customerAddress && { customerAddress: body.customerAddress }),
    };
    
    const errors = validateInquiry(inquiryData);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    // Validate product exists and is active
    const product = await Product.findOne({
      _id: body.product,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or is not active.",
      });
    }

    // Create product snapshot
    const productSnapshot = {
      name: product.name,
      sku: product.sku,
      pricing: {
        price: product.pricing.price,
        salePrice: product.pricing.salePrice,
        currency: product.pricing.currency,
      },
      images: product.images,
      specifications: product.specifications,
    };

    const inquiry = await Inquiry.create({
      user: inquiryData.user,
      product: body.product,
      customerName: inquiryData.customerName.trim(),
      customerEmail: inquiryData.customerEmail.trim().toLowerCase(),
      customerPhone: inquiryData.customerPhone.trim(),
      customerAddress: inquiryData.customerAddress.trim(),
      quantity: Number(body.quantity || 1),
      selectedVariant: body.selectedVariant || "",
      message: body.message || "",
      status: "pending",
      productSnapshot,
    });

    const populatedInquiry = await Inquiry.findById(inquiry._id)
      .populate("user", "fullName email mobile")
      .populate("product", "name slug sku images pricing")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully. We will contact you soon.",
      data: populatedInquiry,
    });
  } catch (error) {
    console.error("Create inquiry:", error.message);

    return res.status(400).json({
      success: false,
      message: "Unable to submit inquiry.",
    });
  }
};

// PUBLIC: Get inquiry by ID (for customer to check status)
const getInquiryById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry ID.",
      });
    }

    const inquiry = await Inquiry.findById(req.params.id)
      .populate("product", "name slug sku images pricing specifications")
      .lean();

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error("Get inquiry:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch inquiry.",
    });
  }
};

// ADMIN: Get all inquiries
const getAllInquiries = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 50,
      sort = "-createdAt",
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const inquiries = await Inquiry.find(query)
      .populate({
        path: "product",
        select: "name slug sku images pricing category subcategory",
        populate: [
          { path: "category", select: "name" },
          { path: "subcategory", select: "name" },
        ],
      })
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Inquiry.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: inquiries.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: inquiries,
    });
  } catch (error) {
    console.error("Get all inquiries:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch inquiries.",
    });
  }
};

// ADMIN: Get one inquiry with full details
const getInquiryByIdAdmin = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry ID.",
      });
    }

    const inquiry = await Inquiry.findById(req.params.id)
      .populate({
        path: "product",
        populate: [
          { path: "category", select: "name slug" },
          { path: "subcategory", select: "name slug" },
        ],
      })
      .lean();

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error("Get inquiry admin:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch inquiry.",
    });
  }
};

// ADMIN: Update inquiry (status, notes, quoted price)
const updateInquiry = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry ID.",
      });
    }

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found.",
      });
    }

    const body = req.body;

    // Update allowed fields
    if (body.status) {
      const allowedStatuses = [
        "pending",
        "contacted",
        "responded",
        "accepted",
        "rejected",
        "completed",
      ];

      if (!allowedStatuses.includes(body.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value.",
        });
      }

      inquiry.status = body.status;
    }

    if (body.adminNotes !== undefined) {
      if (body.adminNotes.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "adminNotes must be at most 2000 characters.",
        });
      }
      inquiry.adminNotes = body.adminNotes;
    }

    if (body.quotedPrice !== undefined) {
      const price = Number(body.quotedPrice);
      if (body.quotedPrice !== null && (isNaN(price) || price < 0)) {
        return res.status(400).json({
          success: false,
          message: "quotedPrice must be a non-negative number or null.",
        });
      }
      inquiry.quotedPrice = body.quotedPrice === null ? null : price;
    }

    await inquiry.save();

    const updatedInquiry = await Inquiry.findById(inquiry._id)
      .populate({
        path: "product",
        populate: [
          { path: "category", select: "name slug" },
          { path: "subcategory", select: "name slug" },
        ],
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Inquiry updated successfully.",
      data: updatedInquiry,
    });
  } catch (error) {
    console.error("Update inquiry:", error.message);

    return res.status(400).json({
      success: false,
      message: "Unable to update inquiry.",
    });
  }
};

// ADMIN: Delete inquiry
const deleteInquiry = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry ID.",
      });
    }

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found.",
      });
    }

    await inquiry.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully.",
    });
  } catch (error) {
    console.error("Delete inquiry:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete inquiry.",
    });
  }
};

// USER: Get all my inquiries (logged-in user)
const getMyInquiries = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const query = {
      user: req.user._id,
    };

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const inquiries = await Inquiry.find(query)
      .populate({
        path: "product",
        select: "name slug sku images pricing specifications category subcategory description isActive",
        populate: [
          { path: "category", select: "name slug" },
          { path: "subcategory", select: "name slug" },
        ],
      })
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Inquiry.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: inquiries.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: inquiries,
    });
  } catch (error) {
    console.error("Get my inquiries:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your inquiries.",
    });
  }
};

// ADMIN: Get inquiry statistics
const getInquiryStats = async (req, res) => {
  try {
    const stats = await Inquiry.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await Inquiry.countDocuments();

    const formattedStats = {
      total,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
    };

    return res.status(200).json({
      success: true,
      data: formattedStats,
    });
  } catch (error) {
    console.error("Get inquiry stats:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch inquiry statistics.",
    });
  }
};

module.exports = {
  createInquiry,
  getInquiryById,
  getMyInquiries,
  getAllInquiries,
  getInquiryByIdAdmin,
  updateInquiry,
  deleteInquiry,
  getInquiryStats,
};
