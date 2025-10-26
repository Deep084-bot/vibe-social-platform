const express = require('express');
const router = express.Router();

// Placeholder for stories routes
router.get('/', (req, res) => {
  res.json({ message: 'Stories API ready for implementation!' });
});

module.exports = router;
