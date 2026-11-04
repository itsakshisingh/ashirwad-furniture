const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Media = require("../models/Media");

const mimeTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
};

async function main() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected!");

  const uploadsRoot = path.join(__dirname, "../../uploads");
  if (!fs.existsSync(uploadsRoot)) {
    console.log("No uploads directory found on disk.");
    process.exit(0);
  }

  const folders = fs.readdirSync(uploadsRoot);
  let migrated = 0;
  let skipped = 0;

  for (const folder of folders) {
    const folderPath = path.join(uploadsRoot, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath);
    console.log(`Processing folder "${folder}" (${files.length} files)...`);

    for (const filename of files) {
      const filePath = path.join(folderPath, filename);
      if (!fs.statSync(filePath).isFile()) continue;

      const ext = path.extname(filename).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";
      const fileBuffer = fs.readFileSync(filePath);

      // Upsert into Media collection
      await Media.findOneAndUpdate(
        { filename },
        {
          filename,
          originalName: filename,
          contentType,
          folder,
          data: fileBuffer,
          size: fileBuffer.length,
        },
        { upsert: true, new: true }
      );
      migrated++;
    }
  }

  console.log(`\nMigration complete! Total ${migrated} files saved permanently into MongoDB Atlas!`);
  const totalCount = await Media.countDocuments();
  console.log(`Total documents in MongoDB "medias" collection: ${totalCount}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

