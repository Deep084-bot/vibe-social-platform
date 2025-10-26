const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// 🛡️ Auth Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// 🎯 JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'genz_social_secret_key_2024';

// 📝 Register Route
router.post('/register', 
  authLimiter,
  [
    body('username')
      .isLength({ min: 3, max: 20 })
      .matches(/^[a-zA-Z0-9._]+$/)
      .withMessage('Username must be 3-20 characters and contain only letters, numbers, dots, and underscores'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('displayName')
      .isLength({ min: 1, max: 50 })
      .withMessage('Display name is required and must be under 50 characters')
  ],
  async (req, res) => {
    try {
      // ✅ Validation Check
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, email, password, displayName } = req.body;

      // 🔍 Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: existingUser.username === username 
            ? 'Username already taken' 
            : 'Email already registered'
        });
      }

      // 🎨 Generate random avatar
      const avatarSeed = Math.random().toString(36).substring(7);
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9&accessories=eyepatch,facialHair,glasses,hat,prescription01,prescription02,round,sunglasses,wayfarers`;

      // 👤 Create new user
      const newUser = new User({
        username,
        email,
        password,
        profile: {
          displayName,
          avatar,
          bio: '✨ New to the community!'
        }
      });

      await newUser.save();

      // 🎫 Generate JWT
      const token = jwt.sign(
        { 
          userId: newUser._id,
          username: newUser.username 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to the community! 🎉',
        user: {
          id: newUser._id,
          username: newUser.username,
          displayName: newUser.profile.displayName,
          avatar: newUser.profile.avatar,
          email: newUser.email
        },
        token
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Something went wrong during registration'
      });
    }
  }
);

// 🔐 Login Route
router.post('/login',
  authLimiter,
  [
    body('identifier')
      .notEmpty()
      .withMessage('Username or email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      // ✅ Validation Check
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { identifier, password } = req.body;

      // 🔍 Find user by username or email
      const user = await User.findOne({
        $or: [
          { username: identifier },
          { email: identifier }
        ]
      }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // 🔑 Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // 🎫 Generate JWT
      const token = jwt.sign(
        { 
          userId: user._id,
          username: user.username 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // 🟢 Update online status
      user.status.isOnline = true;
      user.status.lastSeen = new Date();
      await user.save();

      res.json({
        success: true,
        message: 'Welcome back! 🚀',
        user: {
          id: user._id,
          username: user.username,
          displayName: user.profile.displayName,
          avatar: user.profile.avatar,
          email: user.email,
          theme: user.profile.theme,
          isVerified: user.profile.isVerified
        },
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Something went wrong during login'
      });
    }
  }
);

// 🚪 Logout Route
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      await User.findByIdAndUpdate(decoded.userId, {
        'status.isOnline': false,
        'status.lastSeen': new Date()
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
});

// 🔄 Refresh Token Route
router.post('/refresh', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // 🎫 Generate new token
    const newToken = jwt.sign(
      { 
        userId: user._id,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// 🔍 Check Username Availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!/^[a-zA-Z0-9._]+$/.test(username) || username.length < 3 || username.length > 20) {
      return res.json({
        available: false,
        message: 'Username must be 3-20 characters and contain only letters, numbers, dots, and underscores'
      });
    }

    const existingUser = await User.findOne({ username });
    
    res.json({
      available: !existingUser,
      message: existingUser ? 'Username already taken' : 'Username available'
    });
  } catch (error) {
    res.status(500).json({
      available: false,
      message: 'Error checking username'
    });
  }
});

module.exports = router;
