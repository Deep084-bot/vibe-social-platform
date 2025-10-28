require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const chatRoutes = require('./routes/chat');
const storyRoutes = require('./routes/stories');
const uploadRoutes = require('./routes/uploads');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// expose io to routes via app locals so route handlers can emit events
app.set('io', io);
// expose models and JWT secret for socket handlers
const JWT_SECRET = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  console.error('FATAL: JWT_SECRET must be provided in production environment');
  process.exit(1);
}
const JWT_SECRET_USED = JWT_SECRET || 'genz_social_secret_key_2024';
const User = require('./models/User');
const Message = require('./models/Message');

// 🛡️ Socket.IO authentication middleware: require token on connect and attach user info
io.use((socket, next) => {
  try {
    const token = socket.handshake?.auth?.token;
    if (!token) return next(new Error('Authentication error: token required'));

    const decoded = jwt.verify(token, JWT_SECRET_USED);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    return next();
  } catch (err) {
    console.log('Socket auth error:', err.message || err);
    return next(new Error('Authentication error'));
  }
});

const PORT = process.env.PORT || 3000;

// 🛡️ Security Middleware
// Helmet security headers. Use a relaxed CSP in development and a stricter one in production.
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// 🚦 Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// 🌐 CORS Configuration
// allow developer to set ALLOWED_ORIGINS as a comma-separated env variable (e.g. http://localhost:3000,https://app.example.com)
const allowedOrigins = (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())) ||
  (process.env.NODE_ENV === 'production' ? [process.env.FRONTEND_ORIGIN || 'https://your-domain.com'] : ['http://localhost:3000', 'http://127.0.0.1:3000']);

// Production safety checks
if (process.env.NODE_ENV === 'production') {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is required in production.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET || JWT_SECRET_USED === 'genz_social_secret_key_2024') {
    console.error('❌ A strong JWT_SECRET is required in production (do not use the default).');
    process.exit(1);
  }
}

app.use(cors({
  origin: function(origin, callback) {
    // allow non-browser / curl requests with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('CORS policy: Origin not allowed'), false);
  },
  credentials: true
}));

// 📦 Body Parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 📁 Static Files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 🗄️ MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/genz_social')
  .then(() => console.log('🎯 MongoDB Connected Successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));
// NOTE: mongoose v6+ uses modern drivers by default; no need for useNewUrlParser/useUnifiedTopology

// 🛣️ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/uploads', uploadRoutes);

// 📱 Serve Frontend Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/landing.html'));
});

app.get('/feed', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/feed.html'));
});

app.get('/profile/:username?', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/profile.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/chat.html'));
});

app.get('/discover', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/discover.html'));
});

// 🔌 Socket.IO for Real-time Features
io.on('connection', (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  // mark user online in DB
  if (socket.userId) {
    User.findByIdAndUpdate(socket.userId, { 'status.isOnline': true, 'status.lastSeen': new Date() }).catch(err => console.error('Error setting user online:', err));
  }

  // 💬 Real-time Chat - require authenticated socket
  socket.on('join-chat', (chatId) => {
    if (!socket.userId) return socket.emit('error', { message: 'Authentication required to join chat' });
    socket.join(chatId);
    console.log(`User ${socket.id} (user ${socket.userId}) joined chat: ${chatId}`);
  });

  // Accept messages from socket, persist them, and broadcast
  socket.on('send-message', async (data) => {
    try {
      if (!socket.userId) return socket.emit('error', { message: 'Authentication required to send messages' });
      const { chatId, message } = data;
      if (!chatId || !message?.content) return socket.emit('error', { message: 'Invalid message payload' });

      // create and save message
      const msg = new Message({
        chatId,
        sender: socket.userId,
        senderUsername: socket.username,
        content: message.content,
      });
      await msg.save();

      io.to(chatId).emit('new-message', { chatId, message: msg });
    } catch (err) {
      console.error('Socket send-message error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // 👀 Live Story Views
  socket.on('view-story', (data) => {
    if (!socket.userId) return socket.emit('error', { message: 'Authentication required' });
    socket.to(data.userId).emit('story-viewed', {
      viewerId: data.viewerId,
      storyId: data.storyId
    });
  });

  // 💖 Real-time Reactions
  socket.on('post-reaction', (data) => {
    if (!socket.userId) return socket.emit('error', { message: 'Authentication required' });
    io.emit('reaction-update', data);
  });

  // 🔴 Live Status Updates
  socket.on('user-online', (userId) => {
    if (!socket.userId) return socket.emit('error', { message: 'Authentication required' });
    socket.broadcast.emit('user-status', { userId, status: 'online' });
  });

  socket.on('user-typing', (data) => {
    if (!socket.userId) return socket.emit('error', { message: 'Authentication required' });
    socket.to(data.chatId).emit('typing-indicator', {
      userId: data.userId,
      isTyping: data.isTyping
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
    // mark user offline
    if (socket.userId) {
      User.findByIdAndUpdate(socket.userId, { 'status.isOnline': false, 'status.lastSeen': new Date() }).catch(err => console.error('Error setting user offline:', err));
    }
    socket.broadcast.emit('user-status', { 
      userId: socket.userId, 
      status: 'offline' 
    });
  });
});

// 🚫 404 Handler
app.use('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/pages/404.html'));
});

// 🚨 Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 🚀 Start Server
server.listen(PORT, () => {
  console.log(`
  🚀 Gen Z Social Platform Server Running!
  📱 Frontend: http://localhost:${PORT}
  🔗 API: http://localhost:${PORT}/api
  💬 Real-time: Socket.IO enabled
  🌍 Environment: ${process.env.NODE_ENV || 'development'}
  📁 Uploads: stored locally under /uploads
  `);
});

// 🔄 Graceful Shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close();
    console.log('✅ Server closed.');
    process.exit(0);
  });
});

module.exports = { app, server, io };
