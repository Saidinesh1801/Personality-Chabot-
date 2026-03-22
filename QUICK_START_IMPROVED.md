# Quick Start Guide - Improved Chatbot

## Installation & Running

```bash
# Install dependencies
npm install

# Run in production mode (logs at INFO level)
npm start

# Run in development mode with debug logging
LOG_LEVEL=DEBUG npm start

# Run with custom rate limits
RATE_LIMIT_MAX_REQUESTS=200 npm start
```

## API Endpoints

### 1. Chat Endpoint
**POST** `/api/chat`

```bash
curl -X POST http://localhost:52738/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","personality":"Friendly"}'
```

Response:
```json
{
  "reply": "Hi there! How can I help you today?"
}
```

Error Response (429 - Rate Limited):
```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 900
}
```

### 2. Health Check Endpoint
**GET** `/api/health`

```bash
curl http://localhost:52738/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-25T10:30:45.123Z",
  "uptime": 3600.5
}
```

## Environment Variables

```dotenv
# Server
PORT=52738                      # Server port
HOST=localhost                  # Server host
NODE_ENV=development            # Environment mode

# Logging
LOG_LEVEL=INFO                  # DEBUG | INFO | WARN | ERROR

# Rate Limiting (per 15-minute window by default)
RATE_LIMIT_WINDOW_MS=900000     # Time window in milliseconds
RATE_LIMIT_MAX_REQUESTS=100     # Max requests per window

# Optional LLM Keys
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

## Debugging

### View Debug Logs
```bash
LOG_LEVEL=DEBUG npm start
```

### Monitor Server Health
```bash
watch -n 2 'curl -s http://localhost:52738/api/health | jq .'
```

### Test Rate Limiting
```bash
for i in {1..150}; do curl -X POST http://localhost:52738/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' & done
```

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│  (public/app.js)│
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────────────────────────┐
│  Express Server (server.js)         │
├─────────────────────────────────────┤
│ ✓ Rate Limiter                      │
│ ✓ Input Sanitizer                   │
│ ✓ Validator                         │
│ ✓ Logger                            │
│ ✓ Error Handler                     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Core Modules (src/)                │
├─────────────────────────────────────┤
│ • answering.js - Generate responses │
│ • kb.js - Knowledge base lookup     │
│ • personalities.js - Personality    │
│ • rag.js - Retrieval Augmented Gen  │
│ • llm.js - LLM integration          │
│ • adapters.js - External APIs       │
└─────────────────────────────────────┘
```

## File Structure

```
/
├── server.js              ← Main server (improved!)
├── public/
│   ├── index.html        ← Frontend
│   ├── app.js            ← Frontend logic (improved!)
│   └── style.css         ← Styling
├── src/
│   ├── logger.js         ← NEW: Logging system
│   ├── rateLimiter.js    ← NEW: Rate limiting
│   ├── sanitizer.js      ← NEW: Input sanitization
│   ├── validation.js     ← IMPROVED: Now uses sanitizer
│   ├── answering.js      ← Response generation
│   ├── kb.js             ← Knowledge base
│   ├── personalities.js  ← Personality modes
│   ├── rag.js            ← RAG implementation
│   ├── llm.js            ← LLM interface
│   ├── adapters.js       ← External APIs
│   └── tools.js          ← Tool functions
├── scripts/              ← Data ingestion
├── data/                 ← Knowledge base files
└── docs/
    ├── IMPROVEMENTS_IMPLEMENTED.md
    └── QUICK_START.md (this file)
```

## Common Issues & Solutions

### Rate limit reached during testing
**Error**: `"Too many requests. Please try again later."`
**Solution**: Wait 15 minutes or set higher limits: `RATE_LIMIT_MAX_REQUESTS=500 npm start`

### Logs not showing
**Problem**: Default log level is INFO
**Solution**: `LOG_LEVEL=DEBUG npm start`

### Port already in use
**Problem**: Port 52738 is busy
**Solution**: `PORT=3000 npm start`

### Slow responses
**Problem**: Server taking too long
**Solution**: Check with `/api/health` and monitor logs with `LOG_LEVEL=DEBUG`

## Performance Tips

1. **Use descriptive queries** - "Who is Virat Kohli?" instead of "who"
2. **Enable caching** - Browser caches responses automatically
3. **Monitor rate limits** - Use the health check to ensure stability
4. **Check logs** - Debug issues faster with `LOG_LEVEL=DEBUG`

## Support

For issues or questions:
1. Check logs: `LOG_LEVEL=DEBUG npm start`
2. Run health check: `curl http://localhost:52738/api/health`
3. Test endpoint: Use curl or Postman to test `/api/chat`
4. Review: Check IMPROVEMENTS_IMPLEMENTED.md for feature details
