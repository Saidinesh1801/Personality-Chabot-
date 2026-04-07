const express = require('express');
const router = express.Router();
const db = require('../src/db');
const { generateMemorySummary } = require('../src/memory');

router.get('/', async (req, res) => {
  const memory = db.getUserMemory(req.userId);
  res.json({ memory });
});

router.post('/save', async (req, res) => {
  const { memory } = req.body;
  if (!memory) return res.status(400).json({ error: 'memory is required' });
  db.saveUserMemory(req.userId, memory);
  res.json({ success: true });
});

router.post('/update', async (req, res) => {
  try {
    const chats = db.getAllChats(req.userId);
    if (!chats || chats.length === 0) {
      return res.json({ memory: null, message: 'No chats to extract memory from' });
    }

    let allMessages = [];
    for (const chat of chats.slice(0, 10)) {
      const fullChat = db.getChat(chat.id, req.userId);
      if (fullChat && fullChat.messages) {
        allMessages = allMessages.concat(fullChat.messages);
      }
    }

    if (allMessages.length < 4) {
      return res.json({ memory: null, message: 'Not enough conversation history' });
    }

    const newMemory = await generateMemorySummary(allMessages.slice(-50), req.userId);
    if (newMemory) {
      db.saveUserMemory(req.userId, newMemory);
      res.json({ success: true, memory: newMemory });
    } else {
      res.status(500).json({ error: 'Failed to generate memory' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

module.exports = router;
