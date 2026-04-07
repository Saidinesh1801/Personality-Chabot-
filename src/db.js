/**
 * @file Database module for chatbot - handles all SQLite operations
 * @module src/db
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chatbot.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT,
    role TEXT,
    text TEXT,
    image TEXT,
    ts INTEGER,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    memory_text TEXT NOT NULL,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migrate: add user_id column if missing (for existing databases)
try {
  db.prepare('SELECT user_id FROM sessions LIMIT 1').get();
} catch (e) {
  db.exec('ALTER TABLE sessions ADD COLUMN user_id INTEGER DEFAULT 0');
}
try {
  db.prepare('SELECT user_id FROM chats LIMIT 1').get();
} catch (e) {
  db.exec('ALTER TABLE chats ADD COLUMN user_id INTEGER DEFAULT 0');
}

// --- Users ---

const stmtCreateUser = db.prepare(
  'INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)'
);
/**
 * Creates a new user in the database
 * @param {string} email - User email (will be normalized to lowercase)
 * @param {string} passwordHash - Bcrypt hashed password
 * @param {string} [name] - Optional user name
 * @returns {number} The created user's ID
 */
function createUser(email, passwordHash, name) {
  const result = stmtCreateUser.run(
    email.toLowerCase().trim(),
    passwordHash,
    name || null,
    Date.now()
  );
  return result.lastInsertRowid;
}

const stmtGetUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
function getUserByEmail(email) {
  return stmtGetUserByEmail.get(email.toLowerCase().trim()) || null;
}

const stmtGetUserById = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?');
function getUserById(id) {
  return stmtGetUserById.get(id) || null;
}

const stmtUpdateUserPassword = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
function updateUserPassword(userId, passwordHash) {
  stmtUpdateUserPassword.run(passwordHash, userId);
}

// --- Sessions ---

const stmtCreateSession = db.prepare(
  'INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)'
);
function createSession(token, userId) {
  stmtCreateSession.run(token, userId, Date.now());
}

const stmtGetSession = db.prepare(
  'SELECT s.*, u.email, u.name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?'
);
function getSession(token) {
  return stmtGetSession.get(token) || null;
}

const stmtDeleteSession = db.prepare('DELETE FROM sessions WHERE token = ?');
function deleteSession(token) {
  stmtDeleteSession.run(token);
}

const stmtCleanExpired = db.prepare('DELETE FROM sessions WHERE created_at < ?');
function cleanExpiredSessions(maxAgeMs) {
  stmtCleanExpired.run(Date.now() - maxAgeMs);
}

// --- Chats (user-scoped) ---

const stmtGetAllChats = db.prepare(
  'SELECT id, title, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC'
);
function getAllChats(userId) {
  return stmtGetAllChats.all(userId);
}

const stmtGetChat = db.prepare('SELECT * FROM chats WHERE id = ? AND user_id = ?');
const stmtGetMessages = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY ts ASC');
function getChat(id, userId) {
  const chat = stmtGetChat.get(id, userId);
  if (!chat) return undefined;
  chat.messages = stmtGetMessages.all(id);
  return chat;
}

const stmtCreateChat = db.prepare(
  'INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
);
function createChat(id, userId, title) {
  const now = Date.now();
  stmtCreateChat.run(id, userId, title, now, now);
}

const stmtUpdateChatTitle = db.prepare(
  'UPDATE chats SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?'
);
function updateChatTitle(id, userId, title) {
  stmtUpdateChatTitle.run(title, Date.now(), id, userId);
}

const stmtDeleteChat = db.prepare('DELETE FROM chats WHERE id = ? AND user_id = ?');
function deleteChat(id, userId) {
  stmtDeleteChat.run(id, userId);
}

// --- Messages ---

const stmtAddMessage = db.prepare(
  'INSERT INTO messages (chat_id, role, text, image, ts) VALUES (?, ?, ?, ?, ?)'
);
const stmtTouchChat = db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?');
function addMessage(chatId, role, text, image, ts) {
  stmtAddMessage.run(chatId, role, text, image || null, ts);
  stmtTouchChat.run(ts, chatId);
}

const stmtRecentMessages = db.prepare(
  'SELECT * FROM messages WHERE chat_id = ? ORDER BY ts DESC LIMIT ?'
);
function getRecentMessages(chatId, limit) {
  return stmtRecentMessages.all(chatId, limit).reverse();
}

// --- User Memories (Long-term) ---

const stmtSaveMemory = db.prepare(
  'INSERT OR REPLACE INTO user_memories (user_id, memory_text, created_at, updated_at) VALUES (?, ?, ?, ?)'
);
function saveUserMemory(userId, memoryText) {
  const now = Date.now();
  stmtSaveMemory.run(userId, memoryText, now, now);
}

const stmtGetMemory = db.prepare(
  'SELECT memory_text FROM user_memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1'
);
function getUserMemory(userId) {
  const row = stmtGetMemory.get(userId);
  return row ? row.memory_text : null;
}

module.exports = {
  db,
  createUser,
  getUserByEmail,
  getUserById,
  updateUserPassword,
  createSession,
  getSession,
  deleteSession,
  getAllChats,
  getChat,
  createChat,
  updateChatTitle,
  deleteChat,
  addMessage,
  getRecentMessages,
  saveUserMemory,
  getUserMemory,
};
