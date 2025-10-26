const express = require('express');
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
