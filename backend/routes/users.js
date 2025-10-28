const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// 🔐 Apply auth middleware to all routes
router.use(auth);

// 👤 Get current user profile
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('social.followers', 'username profile.displayName profile.avatar')
      .populate('social.following', 'username profile.displayName profile.avatar');
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// ✏️ Update current user profile
router.put('/me', async (req, res) => {
  try {
    const allowed = ['displayName', 'bio', 'avatar', 'theme', 'website', 'pronouns', 'location', 'birthday', 'coverImage'];
    const updates = {};

    if (!req.body) return res.status(400).json({ success: false, message: 'No data provided' });

    // fetch existing user to allow cleaning up old uploads if replaced
    const existingUser = await User.findById(req.userId).select('profile.avatar profile.coverImage');

    allowed.forEach(field => {
      if (typeof req.body[field] !== 'undefined') {
        updates[`profile.${field}`] = req.body[field];
      }
    });

    // Basic validation for displayName
    if (updates['profile.displayName'] && updates['profile.displayName'].length > 50) {
      return res.status(400).json({ success: false, message: 'Display name must be under 50 characters' });
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true }).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // If user replaced avatar/cover that was stored locally under /uploads, remove old files
    try {
      const uploadsRoot = path.join(__dirname, '../../uploads');
      if (existingUser) {
        const oldAvatar = existingUser.profile?.avatar;
        const newAvatar = user.profile?.avatar;
        if (oldAvatar && oldAvatar.startsWith('/uploads/') && newAvatar && newAvatar !== oldAvatar) {
          const oldName = oldAvatar.replace('/uploads/', '');
          await fs.unlink(path.join(uploadsRoot, oldName)).catch(() => {});
        }

        const oldCover = existingUser.profile?.coverImage;
        const newCover = user.profile?.coverImage;
        if (oldCover && oldCover.startsWith('/uploads/') && newCover && newCover !== oldCover) {
          const oldName = oldCover.replace('/uploads/', '');
          await fs.unlink(path.join(uploadsRoot, oldName)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Failed to cleanup old upload files', e);
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

// 🔍 Search users
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        users: []
      });
    }
    
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { 'profile.displayName': { $regex: q, $options: 'i' } }
      ]
    })
    .select('username profile.displayName profile.avatar profile.isVerified')
    .limit(parseInt(limit));
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Search error'
    });
  }
});

module.exports = router;
