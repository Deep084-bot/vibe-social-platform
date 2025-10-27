const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    text: {
      type: String,
      maxlength: 2200
    },
    media: [{
      type: {
        type: String,
        enum: ['image', 'video', 'audio', 'gif'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      thumbnail: String,
      duration: Number, // for videos/audio
      dimensions: {
        width: Number,
        height: Number
      }
    }],
    mood: {
      type: String,
      enum: ['happy', 'sad', 'excited', 'chill', 'fire', 'blessed', 'vibes']
    },
    location: {
      name: String,
      coordinates: {
        type: [Number] // [longitude, latitude]
      }
    }
  },
  type: {
    type: String,
    enum: ['post', 'story', 'reel'],
    default: 'post'
  },
  engagement: {
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reaction: {
        type: String,
        enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'fire'],
        default: 'like'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    comments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    }],
    shares: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      }
    }],
    saves: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  stats: {
    likesCount: {
      type: Number,
      default: 0
    },
    commentsCount: {
      type: Number,
      default: 0
    },
    sharesCount: {
      type: Number,
      default: 0
    },
    viewsCount: {
      type: Number,
      default: 0
    },
    savesCount: {
      type: Number,
      default: 0
    }
  },
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowShares: {
      type: Boolean,
      default: true
    },
    isAgeRestricted: {
      type: Boolean,
      default: false
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'friends', 'private'],
      default: 'public'
    }
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  trends: {
    isTrending: {
      type: Boolean,
      default: false
    },
    trendScore: {
      type: Number,
      default: 0
    }
  },
  // For Stories only
  storyExpiry: {
    type: Date
  },
  storyViews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// 📈 Calculate Trend Score
postSchema.methods.calculateTrendScore = function() {
  const hoursSinceCreated = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  const engagementRate = (this.stats.likesCount + this.stats.commentsCount * 2 + this.stats.sharesCount * 3) / Math.max(this.stats.viewsCount, 1);
  
  this.trends.trendScore = (engagementRate * 100) / Math.pow(hoursSinceCreated + 1, 0.5);
  return this.trends.trendScore;
};

// 🗑️ Auto-delete expired stories
postSchema.pre('save', function(next) {
  if (this.type === 'story' && !this.storyExpiry) {
    this.storyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

// 🔍 Text Search Index
postSchema.index({ 
  'content.text': 'text', 
  tags: 'text' 
});

// 📍 Geospatial Index
postSchema.index({ 'content.location.coordinates': '2dsphere' });

// 📊 Trending Index
postSchema.index({ 'trends.trendScore': -1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
