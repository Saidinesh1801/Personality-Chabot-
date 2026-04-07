const express = require('express');
const router = express.Router();
const { hasLLM } = require('../src/llm');

router.get('/', (req, res) => {
  try {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      llmAvailable: hasLLM(),
    });
  } catch (err) {
    console.error('[Health] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
