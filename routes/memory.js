const express = require('express');
const router = express.Router();
const db = require('../src/db');
const { createMemorySnapshot } = require('../src/memory');

router.post('/snapshot', async (req, res) => {
  try {
    const { chatId } = req.body;
    if (!chatId) return res.status(400).json({ error: 'chatId required' });
    const chat = db.getChat(chatId, req.userId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const summary = await createMemorySnapshot(req.userId, chat.messages);
    res.json({ summary: summary || 'Not enough context to summarize yet.' });
  } catch (_err) {
    res.status(500).json({ error: 'Failed to create memory snapshot' });
  }
});

module.exports = router;
