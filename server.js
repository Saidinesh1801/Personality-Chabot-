try {
  require('dotenv').config();
} catch (_e) {}

const express = require('express');
const path = require('path');
const cors = require('cors');

const { authMiddleware, isAuthEnabled } = require('./src/auth');
const { createRateLimiter } = require('./src/rateLimiter');
const logger = require('./src/logger');
const { registerBuiltInPlugins, loadPluginsFromDir } = require('./src/plugins');
const { setupWebSocket } = require('./src/websocket');
const { setGenerateAnswer, setHasLLM, setStreamGenerateAnswer } = require('./src/llm');
const { generateAnswer, streamAnswer, hasLLM } = require('./src/llm');
const swaggerSpec = require('./src/swagger');
const swaggerUi = require('swagger-ui-express');

// Initialize LLM module with functions
setGenerateAnswer(generateAnswer);
setStreamGenerateAnswer(generateAnswer);
setHasLLM(() => {
  const { hasOpenAI } = require('./src/providers/openai');
  const { hasLocalLLM } = require('./src/providers/local');
  return hasOpenAI() || process.env.GEMINI_API_KEY || hasLocalLLM();
});

// Initialize plugins
registerBuiltInPlugins();
loadPluginsFromDir();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(createRateLimiter());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware — protects /api/* when AUTH_PASSWORD is set
app.use(authMiddleware);

logger.info('Server starting...', {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 52738,
  auth: isAuthEnabled() ? 'enabled' : 'disabled',
});

// ===== Routes =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/health', require('./routes/health'));
app.use('/api/search', require('./routes/search'));
app.use('/api/chats/search', require('./routes/chatsearch'));
app.use('/api/memory', require('./routes/memory'));
app.use('/api/image', require('./routes/images'));
app.use('/api/plugins', require('./routes/plugins'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/code', require('./routes/code'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/online', require('./routes/status'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/data', require('./routes/data'));
app.use('/api/memory/user', require('./routes/usermemory'));
app.use('/api/test-llm', require('./routes/testllm'));

// Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-spec.json', (_req, res) => {
  res.json(swaggerSpec);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
  });
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 52738;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, function () {
  logger.info(`Server running on http://${HOST}:${this.address().port}`);
  logger.info('Environment', {
    logging: process.env.LOG_LEVEL || 'INFO',
    auth: isAuthEnabled() ? 'enabled (set AUTH_PASSWORD)' : 'disabled',
    rateLimitWindow: `${process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000}ms`,
    rateLimitMax: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  });

  try {
    setupWebSocket(server);
    logger.info('WebSocket server running on /ws');
  } catch (err) {
    logger.warn('WebSocket setup failed (ws package may be missing)', { error: err.message });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
