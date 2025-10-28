const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'genz_social_secret_key_2024';

// GET /api/posts - list posts with simple pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    // support ?following=true to show posts only from people the current user follows
    let query = {};
    if (req.query.following === 'true') {
      // try to read token from Authorization header if present
      let userId = req.userId;
      if (!userId) {
        try {
          const auth = req.headers.authorization || req.headers.Authorization;
          if (auth && auth.startsWith('Bearer ')) {
            const token = auth.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
          }
        } catch (e) {
          userId = null;
        }
      }
      if (userId) {
        const me = await User.findById(userId).select('social.following').lean();
        const following = (me && me.social && me.social.following) || [];
        query.author = { $in: following };
      } else {
        // no user info -> return empty set
        query.author = { $in: [] };
      }
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username profile.displayName profile.avatar'),
      Post.countDocuments(query)
    ]);

    res.json({ success: true, posts, page, limit, total });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Error fetching posts' });
  }
});

// POST /api/posts - create a new post (requires auth)
router.post('/', auth, async (req, res) => {
  try {
    const content = req.body.content || {};

    // basic validation
    if (!content.text && !content.media) {
      return res.status(400).json({ success: false, message: 'Post must have text or media' });
    }
    if (content.text && content.text.length > 2200) {
      return res.status(400).json({ success: false, message: 'Post text too long (max 2200 chars)' });
    }

    const newPost = new Post({
      author: req.userId,
      content,
      type: req.body.type || 'post'
    });

    await newPost.save();
    await newPost.populate('author', 'username profile.displayName profile.avatar');

    // emit real-time event for feeds
    try {
      const io = req.app.get('io');
      if (io) io.emit('new-post', { post: newPost });
    } catch (e) { /* ignore */ }

    res.status(201).json({ success: true, post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, message: 'Error creating post' });
  }
});

// GET /api/posts/:id - get single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username profile.displayName profile.avatar');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, post });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ success: false, message: 'Error fetching post' });
  }
});

// DELETE /api/posts/:id - delete a post (author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.author.toString() !== req.userId) return res.status(403).json({ success: false, message: 'Not authorized' });

    await post.remove();
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Error deleting post' });
  }
});

module.exports = router;
