const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// GET /api/posts - list posts with simple pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profile.displayName profile.avatar');

    res.json({ success: true, posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Error fetching posts' });
  }
});

// POST /api/posts - create a new post (requires auth)
router.post('/', auth, async (req, res) => {
  try {
    const content = req.body.content || {};

    const newPost = new Post({
      author: req.userId,
      content,
      type: req.body.type || 'post'
    });

    await newPost.save();

    // populate author data for response
    await newPost.populate('author', 'username profile.displayName profile.avatar');

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

module.exports = router;
