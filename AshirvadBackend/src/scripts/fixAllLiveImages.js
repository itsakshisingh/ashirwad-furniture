const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const subcatFiles = fs.readdirSync(path.join(__dirname, "../../uploads/subcategories"));
const prodFiles = fs.readdirSync(path.join(__dirname, "../../uploads/products"));

const categoryImageMap = {
  "school-furniture": "/uploads/subcategories/02-furnex-class-pro-ms-three-seater-school-desk.jpg",
  "executive-chair": "/uploads/categories/office-chair.jpg",
  "office-chair": "/uploads/categories/office-chair.jpg",
  "visitor-chair": "/uploads/categories/visitor-chair.jpg",
  "executive-cabin-table": "/uploads/categories/executive-cabin-table.jpg",
  "office-workstation": "/uploads/categories/office-workstation.jpg",
  "ergonomic-chair": "/uploads/categories/ergonomic-chair.jpg",
  "modular-office-workstation": "/uploads/categories/modular-office-workstation.jpg",
  "pedestal-drawer": "/uploads/subcategories/28-furnex-team-pro-office-workstation-furniture.jpg",
  "reception-table": "/uploads/subcategories/25-5x2-5-ft-furnex-executive-cabin-table.jpg",
  "magnetic-whiteboard": "/uploads/subcategories/02-furnex-class-pro-ms-three-seater-school-desk.jpg",
  "kids-activity-table-set": "/uploads/subcategories/06-eduflex-student-desk.jpg",
};

function findBestMatch(slug, name, fileList, folder) {
  const cleanSlug = (slug || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const cleanName = (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // 1. Exact slug match
  let match = fileList.find((f) => f.toLowerCase().includes(cleanSlug));
  if (match) return `/uploads/${folder}/${match}`;

  // 2. Partial match on important words
  const words = cleanName.split("-").filter((w) => w.length > 3 && !["furnex", "seater"].includes(w));
  for (const w of words) {
    match = fileList.find((f) => f.toLowerCase().includes(w));
    if (match) return `/uploads/${folder}/${match}`;
  }

  // 3. Fallback to first available file in folder
  return `/uploads/${folder}/${fileList[0]}`;
}

async function main() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected!");

  const db = mongoose.connection.db;
  const catCol = db.collection("categories");
  const subCol = db.collection("subcategories");
  const prodCol = db.collection("products");

  // 1. Fix Categories
  const categories = await catCol.find({}).toArray();
  console.log(`Fixing ${categories.length} categories...`);
  for (const c of categories) {
    let imgPath = categoryImageMap[c.slug];
    if (!imgPath) {
      imgPath = findBestMatch(c.slug, c.name, subcatFiles, "subcategories");
    }
    await catCol.updateOne(
      { _id: c._id },
      {
        $set: {
          image: [imgPath],
          images: [imgPath],
          isActive: true,
        },
      }
    );
    console.log(`Category: "${c.name}" -> ${imgPath}`);
  }

  // 2. Fix Subcategories
  const subcategories = await subCol.find({}).toArray();
  console.log(`Fixing ${subcategories.length} subcategories...`);
  for (let i = 0; i < subcategories.length; i++) {
    const s = subcategories[i];
    let imgPath = findBestMatch(s.slug, s.name, subcatFiles, "subcategories");
    if (!imgPath) {
      imgPath = `/uploads/subcategories/${subcatFiles[i % subcatFiles.length]}`;
    }
    await subCol.updateOne(
      { _id: s._id },
      {
        $set: {
          images: [imgPath],
          image: [imgPath],
          isActive: true,
        },
      }
    );
    console.log(`Subcategory: "${s.name}" -> ${imgPath}`);
  }

  // 3. Fix Products
  const products = await prodCol.find({}).toArray();
  console.log(`Fixing ${products.length} products...`);
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    let imgPath = findBestMatch(p.slug, p.name, prodFiles, "products");
    if (!imgPath) {
      imgPath = `/uploads/products/${prodFiles[i % prodFiles.length]}`;
    }
    await prodCol.updateOne(
      { _id: p._id },
      {
        $set: {
          images: [imgPath],
          thumbnail: imgPath,
          isActive: true,
        },
      }
    );
    console.log(`Product: "${p.name}" -> ${imgPath}`);
  }

  console.log("All categories, subcategories, and products updated successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
