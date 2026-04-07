const express = require('express');
const router = express.Router();
const db = require('../src/db');

router.get('/', (req, res) => {
  const chats = db.getAllChats(req.userId);
  res.json({ chats });
});

router.get('/:id', (req, res) => {
  const chat = db.getChat(req.params.id, req.userId);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  res.json({ chat });
});

router.post('/', (req, res) => {
  const { id, title } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });
  db.createChat(id, req.userId, title || 'New chat');
  res.json({ success: true });
});

router.put('/:id', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  db.updateChatTitle(req.params.id, req.userId, title);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.deleteChat(req.params.id, req.userId);
  res.json({ success: true });
});

router.post('/:id/messages', (req, res) => {
  const { role, text, image, ts } = req.body;
  if (!role || !text) return res.status(400).json({ error: 'role and text are required' });
  db.addMessage(req.params.id, role, text, image || null, ts || Date.now());
  res.json({ success: true });
});

router.post('/:id/branch', async (req, res) => {
  try {
    const sourceId = req.params.id;
    const { id: newId, title } = req.body;
    if (!newId) return res.status(400).json({ error: 'new id required' });

    const source = db.getChat(sourceId, req.userId);
    if (!source) return res.status(404).json({ error: 'Source chat not found' });

    db.createChat(newId, req.userId, title || (source.title || 'Chat') + ' (branch)');
    for (const msg of source.messages || []) {
      db.addMessage(newId, msg.role, msg.text, msg.image, msg.ts);
    }

    res.json({ success: true, newChatId: newId });
  } catch (_err) {
    res.status(500).json({ error: 'Failed to branch chat' });
  }
});

module.exports = router;
