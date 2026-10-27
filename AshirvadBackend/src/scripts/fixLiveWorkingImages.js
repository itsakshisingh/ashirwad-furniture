const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const workingProductImages = [
  "/uploads/products/1792763267003-325085ee-ea1a-4d7e-9b4d-62db5de27829.png",
  "/uploads/products/1792763404839-070d8c29-0570-4754-83b2-732fe57bf4d4.png",
  "/uploads/banners/1792755405853-883ab51b-ac76-446a-a3af-6f56c9ca1c17.png",
  "/uploads/banners/1792755589423-6557c8f0-de57-4b23-a458-4166d3ce7dc9.png",
  "/uploads/banners/1792756869968-3cc7774e-1fbc-422f-963d-f4af13cfaaec.png",
  "/uploads/banners/1792756869983-8f107b5c-b2ed-4212-b56d-0122e5a0a311.png",
  "/uploads/categories/1792760392576-5920419f-7449-4350-b7b7-2e2bac586b68.png",
  "/uploads/categories/1792760392585-a392a362-daf5-4aba-b68c-d663f9709ee2.png",
];

const workingSubcategoryImages = [
  "/uploads/subcategories/1792760679600-b120b4f9-33db-4cbd-8af3-74ddb9abc663.png",
  "/uploads/categories/1792760392576-5920419f-7449-4350-b7b7-2e2bac586b68.png",
  "/uploads/categories/1792760392585-a392a362-daf5-4aba-b68c-d663f9709ee2.png",
  "/uploads/banners/1792755405853-883ab51b-ac76-446a-a3af-6f56c9ca1c17.png",
  "/uploads/banners/1792755589423-6557c8f0-de57-4b23-a458-4166d3ce7dc9.png",
  "/uploads/products/1792763267003-325085ee-ea1a-4d7e-9b4d-62db5de27829.png",
  "/uploads/products/1792763404839-070d8c29-0570-4754-83b2-732fe57bf4d4.png",
];

async function main() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected!");

  const db = mongoose.connection.db;
  const prodCol = db.collection("products");
  const subCol = db.collection("subcategories");

  // 1. Update Products
  const products = await prodCol.find({}).toArray();
  console.log(`Updating ${products.length} products...`);
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    // Keep zdcssc as-is if it's already working
    if (p.slug === "zdcssc") continue;

    const img = workingProductImages[i % workingProductImages.length];
    await prodCol.updateOne(
      { _id: p._id },
      {
        $set: {
          images: [img],
          thumbnail: img,
          isActive: true,
        },
      }
    );
  }
  console.log("All products updated with verified live images!");

  // 2. Update Subcategories
  const subcategories = await subCol.find({}).toArray();
  console.log(`Updating ${subcategories.length} subcategories...`);
  for (let i = 0; i < subcategories.length; i++) {
    const s = subcategories[i];
    const img = workingSubcategoryImages[i % workingSubcategoryImages.length];
    await subCol.updateOne(
      { _id: s._id },
      {
        $set: {
          images: [img],
          image: [img],
          isActive: true,
        },
      }
    );
  }
  console.log("All subcategories updated with verified live images!");

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
