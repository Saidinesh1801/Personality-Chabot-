/**
 * Rate limiter middleware to prevent abuse
 */

const limits = new Map();

function getRateLimit() {
  return {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 1000, // 1000 requests per window
  };
}

function createRateLimiter() {
  const config = getRateLimit();

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!limits.has(ip)) {
      limits.set(ip, []);
    }

    // Clean old requests outside window
    const requests = limits.get(ip);
    const validRequests = requests.filter((timestamp) => now - timestamp < config.windowMs);
    limits.set(ip, validRequests);

    // Check if over limit
    if (validRequests.length >= config.maxRequests) {
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
      return;
    }

    // Add current request
    validRequests.push(now);
    next();
  };
}

function cleanupOldEntries() {
  const now = Date.now();
  const config = getRateLimit();

  for (const [ip, requests] of limits) {
    const validRequests = requests.filter((timestamp) => now - timestamp < config.windowMs);

    if (validRequests.length === 0) {
      limits.delete(ip);
    } else {
      limits.set(ip, validRequests);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupOldEntries, 5 * 60 * 1000);

module.exports = { createRateLimiter };
