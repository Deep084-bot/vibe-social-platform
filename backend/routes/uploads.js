const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const auth = require('../middleware/auth');
const router = express.Router();

// ensure uploads folder exists
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
if (!fsSync.existsSync(UPLOADS_ROOT)) fsSync.mkdirSync(UPLOADS_ROOT, { recursive: true });

// configure multer to store files with unique names
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_ROOT);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (req, file, cb) => {
    // accept only images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Note: uploads are processed locally with sharp and stored in /uploads.
// Cloudinary integration was removed to keep the app fully local-first.

async function processAvatar(srcPath) {
  const outName = `${Date.now()}-${uuidv4()}-avatar.jpg`;
  const outPath = path.join(UPLOADS_ROOT, outName);
  // resize to 512x512, crop center, convert to optimized jpeg
  await sharp(srcPath)
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82 })
    .toFile(outPath);
  // remove original
  try { await fs.unlink(srcPath); } catch (e) { /* ignore */ }
  return outName;
}

async function processCover(srcPath) {
  const outName = `${Date.now()}-${uuidv4()}-cover.jpg`;
  const outPath = path.join(UPLOADS_ROOT, outName);
  // resize cover to 1200x400 (landscape), crop center
  await sharp(srcPath)
    .resize(1200, 400, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 80 })
    .toFile(outPath);
  try { await fs.unlink(srcPath); } catch (e) { /* ignore */ }
  return outName;
}

// POST /api/uploads - accept avatar and/or coverImage fields (multipart)
router.post('/', auth, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), async (req, res) => {
  try {
    const files = req.files || {};
    const result = {};

    // Always process uploaded images locally
    if (files.avatar && files.avatar[0]) {
      const saved = await processAvatar(files.avatar[0].path);
      result.avatar = `/uploads/${saved}`;
    }

    if (files.coverImage && files.coverImage[0]) {
      const saved = await processCover(files.coverImage[0].path);
      result.coverImage = `/uploads/${saved}`;
    }

    if (Object.keys(result).length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    res.json({ success: true, files: result });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

module.exports = router;
