require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
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

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// 🛡️ Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
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
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// 📦 Body Parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 📁 Static Files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 🗄️ MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/genz_social', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('🎯 MongoDB Connected Successfully!'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// 🛣️ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stories', storyRoutes);

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

  // 💬 Real-time Chat
  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat: ${chatId}`);
  });

  socket.on('send-message', (data) => {
    io.to(data.chatId).emit('new-message', data);
  });

  // 👀 Live Story Views
  socket.on('view-story', (data) => {
    socket.to(data.userId).emit('story-viewed', {
      viewerId: data.viewerId,
      storyId: data.storyId
    });
  });

  // 💖 Real-time Reactions
  socket.on('post-reaction', (data) => {
    io.emit('reaction-update', data);
  });

  // 🔴 Live Status Updates
  socket.on('user-online', (userId) => {
    socket.broadcast.emit('user-status', { userId, status: 'online' });
  });

  socket.on('user-typing', (data) => {
    socket.to(data.chatId).emit('typing-indicator', {
      userId: data.userId,
      isTyping: data.isTyping
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
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
