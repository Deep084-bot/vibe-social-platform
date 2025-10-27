const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// GET /api/chat/:chatId/messages - get messages for a chat
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chatId }).sort({ createdAt: 1 }).limit(100).lean();
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Error fetching messages' });
  }
});

// POST /api/chat/:chatId/messages - create a message (optional auth)
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Message content required' });

    const MessageModel = new Message({
      chatId,
      sender: req.userId,
      senderUsername: req.username,
      content: content.trim()
    });

    await MessageModel.save();

    // Emit to room via Socket.IO if available
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(chatId).emit('new-message', { chatId, message: MessageModel });
      }
    } catch (e) {
      console.error('Error emitting socket message:', e);
    }
    res.status(201).json({ success: true, message: MessageModel });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, message: 'Error creating message' });
  }
});

module.exports = router;
