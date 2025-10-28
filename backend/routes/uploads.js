const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');

const router = express.Router();

// ensure uploads folder exists
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

// configure multer to store files with unique names
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_ROOT);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const name = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: (req, file, cb) => {
    // accept only images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// POST /api/uploads - accept avatar and/or coverImage fields (multipart)
router.post('/', auth, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), (req, res) => {
  try {
    const files = req.files || {};
    const result = {};
    if (files.avatar && files.avatar[0]) {
      result.avatar = `/uploads/${files.avatar[0].filename}`;
    }
    if (files.coverImage && files.coverImage[0]) {
      result.coverImage = `/uploads/${files.coverImage[0].filename}`;
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
