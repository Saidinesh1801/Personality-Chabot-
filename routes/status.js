const express = require('express');
const router = express.Router();
const { getOnlineUsers } = require('../src/websocket');

router.get('/online', (req, res) => {
  res.json({ users: getOnlineUsers() });
});

module.exports = router;
