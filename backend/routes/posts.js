const express = require('express');
const router = express.Router();

// Placeholder routes for future implementation
router.get('/', (req, res) => {
  res.json({ message: 'Posts API coming soon!' });
});

router.get('/chat', (req, res) => {
  res.json({ message: 'Chat API coming soon!' });
});

router.get('/stories', (req, res) => {
  res.json({ message: 'Stories API coming soon!' });
});

module.exports = router;
