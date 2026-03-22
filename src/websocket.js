const { Server } = require('ws');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'chatbot-secret-key';

const clients = new Map();

function setupWebSocket(server) {
  const wss = new Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    let userId = null;
    let authed = false;

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'auth') {
          try {
            const decoded = jwt.verify(msg.token, JWT_SECRET);
            userId = decoded.userId;
            authed = true;
            clients.set(userId, { ws, onlineAt: Date.now() });
            ws.send(JSON.stringify({ type: 'auth_ok', userId }));
            broadcastUserStatus(userId, true);
          } catch (e) {
            ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
          }
          return;
        }

        if (msg.type === 'chat_event') {
          if (!authed) return;
          broadcastChatEvent(userId, msg.chatId, msg.event);
          return;
        }

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }
      } catch (e) {}
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        broadcastUserStatus(userId, false);
      }
    });

    ws.on('error', () => {});
  });

  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  return wss;
}

function broadcastChatEvent(userId, chatId, event) {
  for (const [uid, client] of clients) {
    if (uid === userId) continue;
    if (client.ws.readyState !== 1) continue;
    try {
      client.ws.send(JSON.stringify({ type: 'chat_update', userId, chatId, event }));
    } catch (e) {}
  }
}

function broadcastUserStatus(userId, online) {
  for (const [uid, client] of clients) {
    if (uid === userId) continue;
    if (client.ws.readyState !== 1) continue;
    try {
      client.ws.send(JSON.stringify({ type: 'user_status', userId, online }));
    } catch (e) {}
  }
}

function isUserOnline(userId) {
  return clients.has(userId);
}

function sendToUser(userId, data) {
  const client = clients.get(userId);
  if (client && client.ws.readyState === 1) {
    try {
      client.ws.send(JSON.stringify(data));
      return true;
    } catch (e) {}
  }
  return false;
}

function broadcastTyping(chatId, userId, isTyping) {
  const chats = db.getAllChats(userId);
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  for (const [uid, client] of clients) {
    if (uid === userId) continue;
    if (client.ws.readyState !== 1) continue;
    try {
      client.ws.send(JSON.stringify({ type: 'typing', chatId, userId, isTyping }));
    } catch (e) {}
  }
}

function getOnlineUsers() {
  return Array.from(clients.keys());
}

module.exports = {
  setupWebSocket,
  isUserOnline,
  sendToUser,
  broadcastChatEvent,
  broadcastTyping,
  getOnlineUsers,
};
