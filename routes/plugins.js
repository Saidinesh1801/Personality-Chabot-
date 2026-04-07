const express = require('express');
const router = express.Router();
const { listPlugins, registerPlugin, unregisterPlugin } = require('../src/plugins');

router.get('/', (req, res) => {
  res.json({ plugins: listPlugins() });
});

router.post('/register', (req, res) => {
  try {
    const { id, plugin } = req.body;
    registerPlugin(id, plugin);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const removed = unregisterPlugin(req.params.id);
  res.json({ success: removed });
});

module.exports = router;
