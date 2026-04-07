const express = require('express');
const router = express.Router();
const { searchChats } = require('../src/chatsearch');

router.post('/', async (req, res) => {
  const { query, topK } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const results = await searchChats(req.userId, query, Math.min(Number(topK) || 5, 10));
    res.json({ results });
  } catch (_err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
