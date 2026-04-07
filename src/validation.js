/**
 * @file Request validation module
 * @module src/validation
 */

const { getPersonalities } = require('./personalities');
const { sanitizeMessage } = require('./sanitizer');

function validateChatRequest(body) {
  const { message, personality = 'Friendly', mode = 'default', image } = body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return { valid: false, error: 'Message is required and must be a non-empty string' };
  }

  if (message.length > 2000) {
    return { valid: false, error: 'Message must be at most 2000 characters' };
  }

  const allowed = getPersonalities();
  if (!allowed.includes(personality)) {
    return { valid: false, error: `Personality must be one of: ${allowed.join(', ')}` };
  }

  if (mode && typeof mode !== 'string') {
    return { valid: false, error: 'Mode must be a string' };
  }

  // image is allowed to be any string (URL or encoded data)

  // Sanitize the message to prevent XSS and injection attacks
  const sanitized = sanitizeMessage(message);

  return {
    valid: true,
    message: sanitized,
    personality,
    mode,
    image,
  };
}

module.exports = { validateChatRequest };
