const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// DELETE /api/comments/:id - delete a comment (author or post author)
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const post = await Post.findById(comment.post);
    const isAuthor = comment.author.toString() === req.userId;
    const isPostOwner = post && post.author.toString() === req.userId;
    if (!isAuthor && !isPostOwner) return res.status(403).json({ success: false, message: 'Not authorized to delete comment' });

    await comment.remove();

    // decrement post comment counters if post exists
    if (post) {
      post.engagement.comments = (post.engagement.comments || []).filter(c => c.toString() !== req.params.id);
      post.stats.commentsCount = Math.max(0, (post.stats.commentsCount || 0) - 1);
      await post.save();
    }

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, message: 'Error deleting comment' });
  }
});

module.exports = router;
