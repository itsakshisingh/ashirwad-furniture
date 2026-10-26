const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const subcategoryRoutes = require("./routes/subcategoryRoutes");
const productRoutes = require("./routes/productRoutes");
const inquiryRoutes = require("./routes/inquiryRoutes");
const searchRoutes = require("./routes/searchRoutes");
const filterRoutes = require("./routes/filterRoutes");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow any localhost / 127.0.0.1 origin in development
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
      // Allow ashirwadfurnex.com and all its subdomains
      if (/^https?:\/\/([a-z0-9-]+\.)?ashirwadfurnex\.com$/.test(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/product-images", express.static(path.join(__dirname, "../uploads/products")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Ashirwad Furnex API is running",
  });
});

app.get("/api/v1/health", (req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
  });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/banners", bannerRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/subcategories", subcategoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/inquiries", inquiryRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/filters", filterRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

module.exports = app;
