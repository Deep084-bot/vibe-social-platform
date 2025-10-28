const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-zA-Z0-9._]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    displayName: {
      type: String,
      required: true,
      maxlength: 50
    },
    bio: {
      type: String,
      maxlength: 150,
      default: '✨ Living my best life'
    },
    avatar: {
      type: String,
      default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
    },
    coverImage: {
      type: String,
      default: ''
    },
    // Note: cloud/public storage integration removed; avatar/cover stored as URLs under `avatar` and `coverImage`.
    pronouns: {
      type: String,
      enum: ['he/him', 'she/her', 'they/them', 'custom', ''],
      default: ''
    },
    birthday: Date,
    location: String,
    website: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'neon', 'retro', 'minimal'],
      default: 'dark'
    }
  },
  social: {
    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  stats: {
    postsCount: {
      type: Number,
      default: 0
    },
    followersCount: {
      type: Number,
      default: 0
    },
    followingCount: {
      type: Number,
      default: 0
    },
    likesReceived: {
      type: Number,
      default: 0
    }
  },
  status: {
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    customStatus: {
      emoji: String,
      text: String
    }
  },
  preferences: {
    notifications: {
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      stories: { type: Boolean, default: true }
    },
    privacy: {
      isPrivate: { type: Boolean, default: false },
      showOnlineStatus: { type: Boolean, default: true },
      allowMessages: {
        type: String,
        enum: ['everyone', 'followers', 'nobody'],
        default: 'followers'
      }
    }
  },
  achievements: [{
    type: {
      type: String,
      enum: ['first_post', 'verified', 'trending', 'social_butterfly', 'creator']
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free'
    },
    expiresAt: Date
  }
}, {
  timestamps: true
});

// 🔐 Password Hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 🔑 Password Comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 📊 Update Stats
userSchema.methods.updateStats = async function() {
  const Post = mongoose.model('Post');
  
  this.stats.postsCount = await Post.countDocuments({ author: this._id });
  this.stats.followersCount = this.social.followers.length;
  this.stats.followingCount = this.social.following.length;
  
  await this.save();
};

// 🚫 Hide sensitive data
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  // defensive: social may be undefined in some contexts (e.g., tests)
  if (user.social && Object.prototype.hasOwnProperty.call(user.social, 'blockedUsers')) {
    delete user.social.blockedUsers;
  }
  return user;
};

// 🔍 Search Index
userSchema.index({ username: 'text', 'profile.displayName': 'text' });

module.exports = mongoose.model('User', userSchema);
