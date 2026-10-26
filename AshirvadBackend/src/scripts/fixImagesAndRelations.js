const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const srcImagesDir = path.join(__dirname, "../../../temp_extracted/product-images");
const uploadsBase = path.join(__dirname, "../../uploads");
const uploadsCat = path.join(uploadsBase, "categories");
const uploadsSub = path.join(uploadsBase, "subcategories");
const uploadsProd = path.join(uploadsBase, "products");

fs.mkdirSync(uploadsCat, { recursive: true });
fs.mkdirSync(uploadsSub, { recursive: true });
fs.mkdirSync(uploadsProd, { recursive: true });

const categoryImageMap = {
  "school-furniture": "01-furnex-edumate-ms-two-seater-dual-desk.jpg",
  "executive-chair": "13-furnex-royallux-executive-chair.jpg",
  "office-chair": "18-furnex-ventura-office-chair.jpg",
  "visitor-chair": "22-furnex-revolving-visitor-chair.jpg",
  "executive-cabin-table": "25-5x2-5-ft-furnex-executive-cabin-table.jpg",
  "office-workstation": "28-furnex-team-pro-office-workstation-furniture.jpg",
  "ergonomic-chair": "30-furnex-aromesh-pro-ergonomic-chair.jpg",
  "modular-office-workstation": "31-modular-office-furniture.jpg",
};

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected!");

  const db = mongoose.connection.db;
  const catCol = db.collection("categories");
  const subCol = db.collection("subcategories");
  const prodCol = db.collection("products");

  // 1. Copy files to uploads/products
  if (fs.existsSync(srcImagesDir)) {
    const files = fs.readdirSync(srcImagesDir);
    console.log(`Copying ${files.length} images to uploads/products...`);
    for (const f of files) {
      fs.copyFileSync(path.join(srcImagesDir, f), path.join(uploadsProd, f));
    }
  }

  // 2. Setup Category Images
  console.log("Setting up category images...");
  for (const [slug, srcImgName] of Object.entries(categoryImageMap)) {
    const targetFileName = `${slug}.jpg`;
    const srcFile = path.join(srcImagesDir, srcImgName);
    const targetFile = path.join(uploadsCat, targetFileName);

    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, targetFile);
    }

    const relPath = `/uploads/categories/${targetFileName}`;
    await catCol.updateOne(
      { slug },
      {
        $set: {
          image: [relPath],
          images: [relPath],
          isActive: true,
        },
      }
    );
    console.log(`Updated category: ${slug} -> ${relPath}`);
  }

  // 3. Get all categories for lookup
  const categories = await catCol.find({}).toArray();
  const catMap = {};
  categories.forEach((c) => {
    catMap[c.slug] = c._id;
  });

  // 4. Update Subcategories
  console.log("Setting up subcategories...");
  const subcategories = await subCol.find({}).toArray();
  for (const sub of subcategories) {
    const update = {};

    // Link category ObjectId
    if (sub.categorySlug && catMap[sub.categorySlug]) {
      update.category = catMap[sub.categorySlug];
    }

    // Check if there is a matching product image for this subcategory
    if (fs.existsSync(srcImagesDir)) {
      const files = fs.readdirSync(srcImagesDir);
      const match = files.find((f) => f.includes(sub.slug));
      if (match) {
        // Copy to subcategories upload folder
        fs.copyFileSync(path.join(srcImagesDir, match), path.join(uploadsSub, match));
        const subRelPath = `/uploads/subcategories/${match}`;
        update.images = [subRelPath];
        update.image = [subRelPath];
      }
    }

    update.isActive = true;

    if (Object.keys(update).length > 0) {
      await subCol.updateOne({ _id: sub._id }, { $set: update });
    }
  }
  console.log(`Updated ${subcategories.length} subcategories.`);

  // 5. Get all subcategories for lookup
  const updatedSubs = await subCol.find({}).toArray();
  const subMap = {};
  updatedSubs.forEach((s) => {
    subMap[s.slug] = s._id;
  });

  // 6. Update Products
  console.log("Setting up products...");
  const products = await prodCol.find({}).toArray();
  for (const prod of products) {
    const update = {};

    // Link category ObjectId
    if (prod.categorySlug && catMap[prod.categorySlug]) {
      update.category = catMap[prod.categorySlug];
    }

    // Link subcategory ObjectId
    if (prod.subcategorySlug && subMap[prod.subcategorySlug]) {
      update.subcategory = subMap[prod.subcategorySlug];
    }

    // Normalize images and thumbnail
    let imgList = prod.images || [];
    let updatedImgs = imgList.map((img) => {
      if (typeof img === "string" && img.startsWith("product-images/")) {
        return "/uploads/products/" + img.replace("product-images/", "");
      }
      return img;
    });

    // If image list was empty or relative
    if (updatedImgs.length === 0 && fs.existsSync(srcImagesDir)) {
      const files = fs.readdirSync(srcImagesDir);
      const match = files.find((f) => f.includes(prod.slug));
      if (match) {
        updatedImgs = [`/uploads/products/${match}`];
      }
    }

    if (updatedImgs.length > 0) {
      update.images = updatedImgs;
      update.thumbnail = updatedImgs[0];
    }

    update.isActive = true;

    await prodCol.updateOne({ _id: prod._id }, { $set: update });
  }
  console.log(`Updated ${products.length} products.`);

  console.log("ALL DONE!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

