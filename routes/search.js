const express = require('express');
const router = express.Router();
const { webSearch } = require('../src/websearch');

router.post('/', async (req, res) => {
  const { query, numResults } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const results = await webSearch(query, Math.min(Number(numResults) || 5, 10));
    res.json({ results });
  } catch (_err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
