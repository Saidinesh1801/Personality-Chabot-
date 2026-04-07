/**
 * Input sanitization utilities
 */

function sanitizeString(str) {
  if (typeof str !== 'string') return '';

  // Remove control characters
  let cleaned = str.replace(/[\x00-\x1F\x7F]/g, '');

  // Remove potentially harmful scripts (basic protection)
  cleaned = cleaned
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  return cleaned;
}

function sanitizeMessage(message) {
  if (typeof message !== 'string') return '';

  // Trim and sanitize
  const sanitized = sanitizeString(message).trim();

  // Remove extra whitespace
  return sanitized.replace(/\s+/g, ' ');
}

module.exports = {
  sanitizeString,
  sanitizeMessage,
};
