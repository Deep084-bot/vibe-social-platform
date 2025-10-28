#!/usr/bin/env node
/**
 * Safe Cloudinary cleanup script
 * - Requires CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET
 * - Connects to MongoDB (MONGODB_URI)
 * - Finds users with Cloudinary-hosted avatar/cover or with stored public IDs
 * - If CONFIRM_CLOUDINARY_DELETE=true, deletes the remote assets; otherwise it will only log what it would delete
 * - When a public id can be inferred, it will optionally save it into the user document (if --save-ids flag provided)
 *
 * Usage:
 *   node scripts/cleanup_cloudinary.js --save-ids
 *   CONFIRM_CLOUDINARY_DELETE=true node scripts/cleanup_cloudinary.js --save-ids
 */

const mongoose = require('mongoose');
const User = require('../backend/models/User');
const cloudinary = require('cloudinary').v2;
const argv = require('minimist')(process.argv.slice(2));

async function main() {
  if (!process.env.CLOUDINARY_URL && !(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
    console.error('Cloudinary credentials not found in env. Aborting.');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required to connect to the database. Aborting.');
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const confirmDelete = process.env.CONFIRM_CLOUDINARY_DELETE === 'true';
  const saveIds = argv['save-ids'] === true;

  // find users with cloudinary URLs or public ids stored
  const users = await User.find({
    $or: [
      { 'profile.avatar': /res\.cloudinary\.com/ },
      { 'profile.coverImage': /res\.cloudinary\.com/ },
      { 'profile.avatarPublicId': { $exists: true, $ne: '' } },
      { 'profile.coverImagePublicId': { $exists: true, $ne: '' } }
    ]
  }).limit(500);

  console.log(`Found ${users.length} users to inspect.`);

  for (const u of users) {
    const actions = [];

    if (u.profile.avatarPublicId) {
      actions.push({ type: 'avatarById', id: u.profile.avatarPublicId });
    } else if (u.profile.avatar && /res\.cloudinary\.com/.test(u.profile.avatar)) {
      // try to infer public_id (strip https://res.cloudinary.com/<cloud>/image/upload/<transformations>/v1234/folder/name.ext)
      const m = u.profile.avatar.match(/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*([^.]+)\.[a-zA-Z]+$/);
      if (m && m[1]) actions.push({ type: 'avatarByInferred', id: m[1] });
    }

    if (u.profile.coverImagePublicId) {
      actions.push({ type: 'coverById', id: u.profile.coverImagePublicId });
    } else if (u.profile.coverImage && /res\.cloudinary\.com/.test(u.profile.coverImage)) {
      const m = u.profile.coverImage.match(/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*([^.]+)\.[a-zA-Z]+$/);
      if (m && m[1]) actions.push({ type: 'coverByInferred', id: m[1] });
    }

    if (actions.length === 0) continue;

    console.log(`User: ${u.username} (${u._id}) - actions:`, actions);

    for (const a of actions) {
      console.log(` -> would delete public id: ${a.id} (type: ${a.type})`);
      if (confirmDelete) {
        try {
          const resp = await cloudinary.uploader.destroy(a.id, { resource_type: 'image' });
          console.log('    destroy response:', resp);
        } catch (e) {
          console.error('    destroy failed:', e.message || e);
        }
      }
      if (saveIds && (a.type === 'avatarByInferred' || a.type === 'coverByInferred')) {
        // store the inferred id in user doc
        if (a.type.startsWith('avatar')) {
          u.profile.avatarPublicId = a.id;
        } else {
          u.profile.coverImagePublicId = a.id;
        }
      }
    }

    if (saveIds) {
      try { await u.save(); console.log('  saved inferred ids for user'); } catch (e) { console.error('  save failed', e); }
    }
  }

  console.log('Done.');
  await mongoose.disconnect();
}

main().catch(err => { console.error('Script error', err); process.exit(1); });
