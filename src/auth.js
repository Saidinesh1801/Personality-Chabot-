/**
 * Email/password authentication with signup and login.
 * Sessions are stored in SQLite via the db module.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('./db');

const SALT_ROUNDS = 10;

const verificationCodes = new Map();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

let transporter = null;

function initEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  console.log('[Email] initEmailTransporter called');
  console.log('[Email] SMTP_HOST:', smtpHost);
  console.log('[Email] SMTP_PORT:', smtpPort);
  console.log('[Email] SMTP_USER:', smtpUser);
  console.log('[Email] SMTP_PASS:', smtpPass ? 'set' : 'not set');

  if (smtpHost && smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: false,
      requireTLS: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    transporter.verify(function (error, success) {
      if (error) {
        console.log('[Email] SMTP connection error:', error.message);
      } else {
        console.log('[Email] SMTP server is ready to take our messages');
      }
    });

    console.log('[Email] SMTP transporter created successfully (port 587 with TLS)');
  } else {
    console.log('[Email] No SMTP configured - codes will log to console');
  }
}

initEmailTransporter();

async function sendVerificationEmail(email, code) {
  console.log('[Email] sendVerificationEmail called for:', email);
  console.log('[Email] transporter available:', transporter ? 'yes' : 'no');

  const mailOptions = {
    from: process.env.SMTP_FROM || 'NexusAI <noreply@nexusai.com>',
    to: email,
    subject: 'NexusAI - Password Reset Code',
    html: `
			<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
				<div style="background: linear-gradient(135deg, #00d4ff, #8b5cf6); padding: 20px; border-radius: 10px; text-align: center;">
					<h1 style="color: white; margin: 0;">NexusAI</h1>
				</div>
				<div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
					<h2 style="color: #333;">Password Reset</h2>
					<p style="color: #666;">Your password reset code is:</p>
					<div style="background: #fff; padding: 15px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00d4ff; margin: 20px 0;">
						${code}
					</div>
					<p style="color: #666; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
					<p style="color: #999; font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
				</div>
			</div>
		`,
  };

  if (transporter) {
    console.log('[Email] Attempting to send email via transporter...');
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email] SUCCESS - Password reset code sent to: ${email}`);
      console.log(`[Email] Message ID: ${info.messageId}`);
    } catch (err) {
      console.error('[Email] FAILED to send email:', err.message);
      if (err.code === 'EAUTH') {
        console.error('[Email] Authentication failed - check SMTP user/password');
      }
      console.log(`[Email] Code for ${email}: ${code} (fallback to console)`);
    }
  } else {
    console.log(`\n========== PASSWORD RESET CODE ==========`);
    console.log(`To: ${email}`);
    console.log(`Your verification code is: ${code}`);
    console.log(`This code expires in 10 minutes.`);
    console.log(`==========================================\n`);
  }
}

function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [key, data] of verificationCodes) {
    if (now > data.expiresAt) {
      verificationCodes.delete(key);
    }
  }
}
setInterval(cleanupExpiredCodes, 60000);

// Paths that never require authentication
const openPaths = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/status',
  '/api/auth/forgot-password',
  '/api/auth/verify-code',
  '/api/auth/reset-password',
  '/api/health',
  '/api/test-email',
  '/api/test-llm',
  '/api/test-llm/test',
];

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

async function handleForgotPassword(req, res) {
  const { email } = req.body || {};

  console.log('[Auth] Forgot password request for:', email);

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const user = db.getUserByEmail(email);
  console.log('[Auth] User found:', user ? 'yes' : 'no');

  if (!user) {
    return res.json({
      message: 'If an account with this email exists, a verification code has been sent.',
    });
  }

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  verificationCodes.set(email, { code, expiresAt, attempts: 0 });

  console.log(`[Auth] Generated code ${code} for ${email}, calling sendVerificationEmail...`);

  try {
    await sendVerificationEmail(email, code);
    console.log('[Auth] sendVerificationEmail completed');
  } catch (err) {
    console.error('[Auth] Email error:', err);
  }

  res.json({ message: 'If an account with this email exists, a verification code has been sent.' });
}

function handleVerifyCode(req, res) {
  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const data = verificationCodes.get(email);
  if (!data) {
    return res
      .status(400)
      .json({ error: 'No verification code found. Please request a new code.' });
  }

  if (Date.now() > data.expiresAt) {
    verificationCodes.delete(email);
    return res.status(400).json({ error: 'Code has expired. Please request a new code.' });
  }

  if (data.code !== code) {
    data.attempts += 1;
    if (data.attempts >= 5) {
      verificationCodes.delete(email);
      return res
        .status(400)
        .json({ error: 'Too many failed attempts. Please request a new code.' });
    }
    return res
      .status(400)
      .json({ error: 'Invalid code. ' + (5 - data.attempts) + ' attempts remaining.' });
  }

  verificationCodes.delete(email);
  res.json({ valid: true });
}

async function handleResetPassword(req, res) {
  const { email, code, newPassword } = req.body || {};

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const data = verificationCodes.get(email);
  if (!data) {
    return res
      .status(400)
      .json({ error: 'No verification code found. Please request a new code.' });
  }

  if (Date.now() > data.expiresAt) {
    verificationCodes.delete(email);
    return res.status(400).json({ error: 'Code has expired. Please request a new code.' });
  }

  if (data.code !== code) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.updateUserPassword(user.id, passwordHash);
    verificationCodes.delete(email);

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

module.exports = {
  authMiddleware,
  handleSignup,
  handleLogin,
  handleStatus,
  handleLogout,
  handleForgotPassword,
  handleVerifyCode,
  handleResetPassword,
  isAuthEnabled,
  sendVerificationEmail,
};
