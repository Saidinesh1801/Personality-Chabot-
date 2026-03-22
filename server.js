try { require('dotenv').config(); } catch (e) {}

const express = require('express');
const path = require('path');
const cors = require('cors');

const { validateChatRequest } = require('./src/validation');
const { generateReply, setGenerateAnswer, setHasLLM, buildFullPrompt } = require('./src/answering');
const { generateAnswer, streamAnswer, hasLLM } = require('./src/llm');
const { webSearch } = require('./src/websearch');
const { searchChats } = require('./src/chatsearch');
const { createMemorySnapshot, buildMemoryPrompt, getMemorySummary } = require('./src/memory');
const { processCodeBlocks } = require('./src/codeexec');
const { generateImage, detectImageRequest } = require('./src/imagegen');
const { listPlugins, registerBuiltInPlugins, loadPluginsFromDir, matchAndExecute, registerPlugin, unregisterPlugin } = require('./src/plugins');
const { setupWebSocket, isUserOnline, getOnlineUsers, sendToUser } = require('./src/websocket');
const { createTeam, getUserTeams, addTeamMember, getTeamMembers, shareChatWithTeam, getTeamChats, getTeam, leaveTeam, deleteTeam } = require('./src/teams');
const { createRateLimiter } = require('./src/rateLimiter');
const { sanitizeMessage } = require('./src/sanitizer');
const { authMiddleware, handleSignup, handleLogin, handleStatus, handleLogout, isAuthEnabled } = require('./src/auth');
const db = require('./src/db');
const logger = require('./src/logger');
const { PDFParse } = require('pdf-parse');
const { pathToFileURL } = require('url');
let AdmZip;
try { AdmZip = require('adm-zip'); } catch (e) { /* optional */ }

// Configure pdf-parse worker for Windows compatibility
const pdfWorkerPath = pathToFileURL(
  path.join(path.dirname(require.resolve('pdf-parse')), 'pdf.worker.mjs')
).href;
PDFParse.setWorker(pdfWorkerPath);

setGenerateAnswer(generateAnswer);
setHasLLM(hasLLM);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(createRateLimiter());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware — protects /api/* when AUTH_PASSWORD is set
app.use(authMiddleware);

logger.info('Server starting...', { 
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 52738,
  auth: isAuthEnabled() ? 'enabled' : 'disabled',
});

// ===== Auth endpoints =====
app.post('/api/auth/signup', handleSignup);
app.post('/api/auth/login', handleLogin);
app.get('/api/auth/status', handleStatus);
app.post('/api/auth/logout', handleLogout);

// ===== Health =====
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    llmAvailable: hasLLM(),
  });
});

// ===== Web Search =====
app.post('/api/search', async (req, res) => {
  const { query, numResults } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const results = await webSearch(query, Math.min(Number(numResults) || 5, 10));
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ===== Semantic Chat Search =====
app.post('/api/chats/search', async (req, res) => {
  const { query, topK } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const results = await searchChats(req.userId, query, Math.min(Number(topK) || 5, 10));
    res.json({ results });
  } catch (err) {
    logger.error('Chat search error', { error: err.message });
    res.status(500).json({ error: 'Search failed' });
  }
});

// ===== Memory Snapshot =====
app.post('/api/memory/snapshot', async (req, res) => {
  try {
    const { chatId } = req.body;
    if (!chatId) return res.status(400).json({ error: 'chatId required' });
    const chat = db.getChat(chatId, req.userId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const summary = await createMemorySnapshot(req.userId, chat.messages);
    res.json({ summary: summary || 'Not enough context to summarize yet.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create memory snapshot' });
  }
});

// ===== Branch Chat (Fork) =====
app.post('/api/chats/:id/branch', async (req, res) => {
  try {
    const sourceId = req.params.id;
    const { id: newId, title } = req.body;
    if (!newId) return res.status(400).json({ error: 'new id required' });

    const source = db.getChat(sourceId, req.userId);
    if (!source) return res.status(404).json({ error: 'Source chat not found' });

    db.createChat(newId, req.userId, title || (source.title || 'Chat') + ' (branch)');
    for (const msg of (source.messages || [])) {
      db.addMessage(newId, msg.role, msg.text, msg.image, msg.ts);
    }

    res.json({ success: true, newChatId: newId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to branch chat' });
  }
});

// ===== Image Generation =====
app.post('/api/image/generate', async (req, res) => {
  const { prompt, style } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  try {
    const imageData = await generateImage(prompt, style);
    if (imageData) {
      res.json({ success: true, image: imageData });
    } else {
      res.status(503).json({ error: 'No image generation provider configured. Set OPENAI_API_KEY or LEONARDO_API_KEY in .env' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Image generation failed' });
  }
});

// ===== Plugins =====
registerBuiltInPlugins();
loadPluginsFromDir();

app.get('/api/plugins', (req, res) => {
  res.json({ plugins: listPlugins() });
});

app.post('/api/plugins/register', (req, res) => {
  try {
    const { id, plugin } = req.body;
    registerPlugin(id, plugin);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/plugins/:id', (req, res) => {
  const removed = unregisterPlugin(req.params.id);
  res.json({ success: removed });
});

// ===== Teams =====
app.get('/api/teams', (req, res) => {
  const teams = getUserTeams(req.userId);
  res.json({ teams });
});

app.post('/api/teams', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const teamId = createTeam(name, req.userId);
  res.json({ teamId, name });
});

app.get('/api/teams/:id', (req, res) => {
  const team = getTeam(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  const members = getTeamMembers(req.params.id);
  const isMember = members.some(m => m.userId === req.userId);
  if (!isMember) return res.status(403).json({ error: 'Not a team member' });
  const chats = getTeamChats(req.params.id, req.userId);
  res.json({ team, members, chats });
});

app.post('/api/teams/:id/members', (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const user = db.getUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  addTeamMember(req.params.id, user.id, role || 'member');
  res.json({ success: true });
});

app.delete('/api/teams/:id/members/:userId', (req, res) => {
  removeTeamMember(req.params.id, parseInt(req.params.userId));
  res.json({ success: true });
});

app.post('/api/teams/:id/share/:chatId', (req, res) => {
  const shared = shareChatWithTeam(req.params.chatId, req.params.id, req.userId);
  res.json({ success: shared });
});

app.get('/api/teams/:id/chats', (req, res) => {
  const chats = getTeamChats(req.params.id, req.userId);
  res.json({ chats });
});

app.delete('/api/teams/:id', (req, res) => {
  const deleted = deleteTeam(req.params.id, req.userId);
  res.json({ success: deleted });
});

// ===== Online Users =====
app.get('/api/online', (req, res) => {
  res.json({ users: getOnlineUsers() });
});

// ===== Code Execution =====
app.post('/api/code/execute', async (req, res) => {
  const { code, language } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });
  if (language && language !== 'javascript' && language !== 'js') {
    return res.status(400).json({ error: 'Only JavaScript execution is supported' });
  }
  const vm = require('vm');
  const sandbox = {
    console: {
      log: (...a) => '[LOG] ' + a.join(' '),
      error: (...a) => '[ERROR] ' + a.join(' '),
      warn: (...a) => '[WARN] ' + a.join(' '),
    },
    Math, Date, JSON, Array, Object, String, Number, Boolean, Map, Set,
  };
  try {
    const script = new vm.Script(code);
    const ctx = vm.createContext(sandbox);
    script.runInContext(ctx, { timeout: 5000 });
    res.json({ success: true, output: sandbox._output || '(no output)' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== Chat CRUD (user-scoped, server-side persistence) =====
app.get('/api/chats', (req, res) => {
  const chats = db.getAllChats(req.userId);
  res.json({ chats });
});

app.get('/api/chats/:id', (req, res) => {
  const chat = db.getChat(req.params.id, req.userId);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  res.json({ chat });
});

app.post('/api/chats', (req, res) => {
  const { id, title } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });
  db.createChat(id, req.userId, title || 'New chat');
  res.json({ success: true });
});

app.put('/api/chats/:id', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  db.updateChatTitle(req.params.id, req.userId, title);
  res.json({ success: true });
});

app.delete('/api/chats/:id', (req, res) => {
  db.deleteChat(req.params.id, req.userId);
  res.json({ success: true });
});

app.post('/api/chats/:id/messages', (req, res) => {
  const { role, text, image, ts } = req.body;
  if (!role || !text) return res.status(400).json({ error: 'role and text are required' });
  db.addMessage(req.params.id, role, text, image || null, ts || Date.now());
  res.json({ success: true });
});

// ===== PDF Upload & Extract =====
app.post('/api/upload/pdf', async (req, res) => {
  try {
    const { pdf } = req.body;
    if (!pdf) return res.status(400).json({ error: 'No PDF data provided' });

    // Extract base64 data from data URI
    const match = pdf.match(/^data:application\/pdf;base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid PDF format' });

    const buffer = Buffer.from(match[1], 'base64');

    // Limit to 20MB
    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(413).json({ error: 'PDF too large (max 20MB)' });
    }

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = (result.text || '').trim();
    const pages = result.total || 0;

    // Clean up
    await parser.destroy().catch(() => {});

    if (!text) {
      return res.json({ text: '', pages, warning: 'No readable text found in PDF. It may be a scanned document.' });
    }

    logger.info('PDF extracted', { pages, chars: text.length });
    res.json({ text, pages });
  } catch (error) {
    logger.error('PDF extraction failed', { error: error.message });
    res.status(500).json({ error: 'Failed to extract text from PDF' });
  }
});

// ===== PPT/PPTX Upload & Extract =====
app.post('/api/upload/pptx', async (req, res) => {
  try {
    const { file: fileData, filename } = req.body;
    if (!fileData) return res.status(400).json({ error: 'No file data provided' });

    const match = fileData.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid file format' });

    const buffer = Buffer.from(match[1], 'base64');

    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large (max 20MB)' });
    }

    if (!AdmZip) {
      return res.status(500).json({ error: 'PPTX support requires adm-zip package. Run: npm install adm-zip' });
    }

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const slideTexts = [];

    // Sort slide entries by name to maintain order
    const slideEntries = entries
      .filter(e => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
      .sort((a, b) => {
        const numA = parseInt(a.entryName.match(/slide(\d+)/)[1]);
        const numB = parseInt(b.entryName.match(/slide(\d+)/)[1]);
        return numA - numB;
      });

    for (const entry of slideEntries) {
      const xml = entry.getData().toString('utf8');
      // Extract text from XML by stripping tags and getting <a:t> content
      const texts = [];
      const regex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
      let m;
      while ((m = regex.exec(xml)) !== null) {
        if (m[1].trim()) texts.push(m[1]);
      }
      if (texts.length > 0) {
        const slideNum = entry.entryName.match(/slide(\d+)/)[1];
        slideTexts.push(`--- Slide ${slideNum} ---\n${texts.join(' ')}`);
      }
    }

    const text = slideTexts.join('\n\n').trim();
    const slides = slideEntries.length;

    if (!text) {
      return res.json({ text: '', slides, warning: 'No readable text found in presentation.' });
    }

    logger.info('PPTX extracted', { slides, chars: text.length });
    res.json({ text, slides });
  } catch (error) {
    logger.error('PPTX extraction failed', { error: error.message });
    res.status(500).json({ error: 'Failed to extract text from presentation' });
  }
});

// ===== Chat (non-streaming) =====
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    const result = validateChatRequest(req.body);
    if (!result.valid) {
      logger.warn('Invalid chat request', { error: result.error });
      return res.status(400).json({ error: result.error });
    }

    const sanitized = sanitizeMessage(result.message);
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-10) : [];
    const mode = result.mode || 'default';
    const image = result.image || null;

    const pdfContext = req.body.pdfContext || null;
    const reply = await generateReply(sanitized, result.personality, history, {
      mode,
      image,
      pdfContext,
    });
    
    const responseTime = Date.now() - startTime;
    logger.debug('Chat request completed', { 
      messageLength: sanitized.length,
      personality: result.personality,
      responseTime: `${responseTime}ms`,
    });

    res.json({ reply });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Error in /api/chat', { 
      error: error.message,
      stack: error.stack,
      responseTime: `${responseTime}ms`
    });
    res.status(500).json({ 
      error: 'Failed to generate response. Please try again.',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== Chat (streaming via SSE) =====
app.post('/api/chat/stream', async (req, res) => {
  try {
    const result = validateChatRequest(req.body);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    const sanitized = sanitizeMessage(result.message);
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-10) : [];
    const mode = result.mode || 'default';
    const image = result.image || null;
    const pdfContext = req.body.pdfContext || null;
    const personality = result.personality;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let searchContext = null;
    if (mode === 'web-search' && hasLLM()) {
      res.write(`data: ${JSON.stringify({ thinking: 'Searching the web...' })}\n\n`);
      const results = await webSearch(sanitized, 5);
      if (results.length > 0) {
        const contextParts = results.map((r, i) => `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join('\n\n');
        searchContext = `Web Search Results for "${sanitized}":\n\n${contextParts}\n\nUse this information to provide accurate, up-to-date answers.`;
        res.write(`data: ${JSON.stringify({ thinking: 'Found ' + results.length + ' results. Generating response...' })}\n\n`);
      }
    }

    const effectiveContext = searchContext || pdfContext;
    const memoryPrompt = buildMemoryPrompt(req.userId, history);
    let fullPersonalityPrompt = buildFullPrompt(sanitized, personality, { mode, pdfContext: !!effectiveContext });
    if (memoryPrompt) {
      fullPersonalityPrompt += '\n\n' + memoryPrompt;
    }

    // Inject custom instructions if set
    if (req.body.customInstructions) {
      fullPersonalityPrompt += '\n\nAdditional user preferences: ' + req.body.customInstructions;
    }
    if (req.body.nickname) {
      fullPersonalityPrompt += '\n\nThe user\'s name is ' + req.body.nickname + '.';
    }
    if (req.body.occupation) {
      fullPersonalityPrompt += '\n\nThe user\'s occupation is: ' + req.body.occupation + '.';
    }

    if (mode === 'deep-research' && hasLLM()) {
      res.write(`data: ${JSON.stringify({ thinking: 'Conducting deep research...' })}\n\n`);
    }

    // Check for image generation requests
    if (detectImageRequest(sanitized)) {
      res.write(`data: ${JSON.stringify({ thinking: 'Generating image...' })}\n\n`);
      const imageData = await generateImage(sanitized);
      if (imageData) {
        res.write(`data: ${JSON.stringify({ chunk: `Here is the image I generated based on your request:\n\n![Generated Image](${imageData})\n\n_Image generated by AI_` })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ chunk: `I'd love to generate an image for you! To enable image generation, set your **OPENAI_API_KEY** in .env (free at https://platform.openai.com/api-keys) or **LEONARDO_API_KEY** for Leonardo.ai.` })}\n\n`);
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    // Check for plugin matches
    const pluginResults = await matchAndExecute(sanitized, { llm: generateAnswer });
    let pluginHandled = false;
    for (const { pluginId, result } of pluginResults) {
      if (result && result.text) {
        res.write(`data: ${JSON.stringify({ chunk: `${result.text}` })}\n\n`);
        // Skip LLM for definitive plugins
        if (['weather', 'calculator', 'reminder'].includes(pluginId)) {
          pluginHandled = true;
        }
      }
    }

    if (pluginHandled) {
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    await streamAnswer(
      sanitized, effectiveContext, history, fullPersonalityPrompt,
      { mode, image, userId: req.userId },
      (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      },
      () => {
        res.write(`data: [DONE]\n\n`);
        res.end();
      },
      (err) => {
        logger.error('Stream error', { error: err.message });
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    );
  } catch (error) {
    logger.error('Error in /api/chat/stream', { error: error.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Streaming failed' });
    } else {
      res.end();
    }
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { 
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 52738;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, function() {
  logger.info(`Server running on http://${HOST}:${this.address().port}`);
  logger.info('Environment', { 
    logging: process.env.LOG_LEVEL || 'INFO',
    auth: isAuthEnabled() ? 'enabled (set AUTH_PASSWORD)' : 'disabled',
    rateLimitWindow: `${process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000}ms`,
    rateLimitMax: process.env.RATE_LIMIT_MAX_REQUESTS || 100
  });

  // Setup WebSocket for real-time features
  try {
    const { setupWebSocket } = require('./src/websocket');
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
