const express = require('express');
const router = express.Router();
const {
  handleSignup,
  handleLogin,
  handleStatus,
  handleLogout,
  handleForgotPassword,
  handleVerifyCode,
  handleResetPassword,
  sendVerificationEmail,
} = require('../src/auth');

router.post('/signup', handleSignup);
router.post('/login', handleLogin);
router.get('/status', handleStatus);
router.post('/logout', handleLogout);
router.post('/forgot-password', handleForgotPassword);
router.post('/verify-code', handleVerifyCode);
router.post('/reset-password', handleResetPassword);

router.post('/test-email', async (req, res) => {
  try {
    await sendVerificationEmail('blacksolutions.chapter1@gmail.com', '123456');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
