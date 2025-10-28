#!/usr/bin/env node
/**
 * Orphaned Uploads Report
 * - Scans ./uploads for files not referenced by the database
 * - Checks User.profile.avatar, User.profile.coverImage and Post.content.media.url
 * - Writes scripts/orphaned_uploads_report.json with findings
 *
 * Usage:
 *   node scripts/orphaned_uploads_report.js
 */

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const User = require('../backend/models/User');
const Post = require('../backend/models/Post');

async function main() {
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fsSync.existsSync(uploadsDir)) {
    console.log('No uploads folder found; nothing to report.');
    process.exit(0);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/genz_social';
  await mongoose.connect(mongoUri);

  // list files
  const files = await fs.readdir(uploadsDir);

  // collect referenced filenames from Users
  const userDocs = await User.find({}, 'profile.avatar profile.coverImage').lean();
  const referenced = new Set();
  userDocs.forEach(u => {
    const a = u?.profile?.avatar;
    const c = u?.profile?.coverImage;
    if (a && a.startsWith('/uploads/')) referenced.add(a.replace('/uploads/', ''));
    if (c && c.startsWith('/uploads/')) referenced.add(c.replace('/uploads/', ''));
  });

  // collect from Posts (content.media.url)
  const postDocs = await Post.find({ 'content.media.url': /uploads\// }, 'content.media').lean();
  postDocs.forEach(p => {
    const media = p?.content?.media || [];
    media.forEach(m => {
      if (m?.url && m.url.includes('/uploads/')) {
        const parts = m.url.split('/uploads/');
        const fname = parts[parts.length - 1];
        referenced.add(fname);
      }
    });
  });

  const orphaned = files.filter(f => !referenced.has(f));

  const out = {
    scannedAt: new Date().toISOString(),
    uploadsDir,
    totalFiles: files.length,
    referencedCount: referenced.size,
    orphanedCount: orphaned.length,
    orphanedFiles: orphaned
  };

  const outPath = path.join(__dirname, 'orphaned_uploads_report.json');
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote orphan report to ${outPath} — ${orphaned.length} orphaned files found`);

  await mongoose.disconnect();
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
