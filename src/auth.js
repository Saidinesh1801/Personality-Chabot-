/**
 * Email/password authentication with signup and login.
 * Sessions are stored in SQLite via the db module.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('./db');

const SALT_ROUNDS = 10;

// Paths that never require authentication
const openPaths = ['/api/auth/login', '/api/auth/signup', '/api/auth/status', '/api/health'];

function isAuthEnabled() {
  // Auth is always enabled with the email system — every user has their own account
  return true;
}

function authMiddleware(req, res, next) {
  // Allow open paths through
  if (openPaths.includes(req.path)) {
    return next();
  }

  // Only protect /api/* routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  const session = db.getSession(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // Attach user info to request for downstream handlers
  req.userId = session.user_id;
  req.userEmail = session.email;
  req.userName = session.name;

  next();
}

async function handleSignup(req, res) {
  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check if email already exists
  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = db.createUser(email, passwordHash, name || null);

    // Auto-login after signup
    const token = uuidv4();
    db.createSession(token, userId);

    const user = db.getUserById(userId);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
}

async function handleLogin(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = uuidv4();
  db.createSession(token, user.id);

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

function handleStatus(req, res) {
  const authRequired = true;
  let authenticated = false;
  let user = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = db.getSession(token);
    if (session) {
      authenticated = true;
      user = { id: session.user_id, email: session.email, name: session.name };
    }
  }

  res.json({ authRequired, authenticated, user });
}

function handleLogout(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    db.deleteSession(token);
  }

  res.json({ success: true });
}

module.exports = { authMiddleware, handleSignup, handleLogin, handleStatus, handleLogout, isAuthEnabled };
