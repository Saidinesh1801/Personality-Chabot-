const express = require('express');
const router = express.Router();
const { generateAnswer } = require('../src/llm');

router.post('/test', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    console.log('[Test API] Received message:', message);

    const result = await generateAnswer(message, null, [], 'You are a helpful assistant.', {});

    console.log('[Test API] Result:', result);

    res.json(result);
  } catch (err) {
    console.error('[Test API] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
