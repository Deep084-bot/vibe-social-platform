const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    media: {
      type: String, // GIF or image URL
      default: ''
    }
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  engagement: {
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reaction: {
        type: String,
        enum: ['like', 'love', 'laugh', 'fire'],
        default: 'like'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    likesCount: {
      type: Number,
      default: 0
    }
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date
}, {
  timestamps: true
});

// 🔍 Text Search
commentSchema.index({ 'content.text': 'text' });

module.exports = mongoose.model('Comment', commentSchema);
