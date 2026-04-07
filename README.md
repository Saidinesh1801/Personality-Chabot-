# Personality Chatbot

A full-featured AI chatbot with selectable personalities, voice conversation, image generation, team collaboration, and a plugin system.

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:3000

## Features

### AI Models

- **Gemini** (free) — set `GEMINI_API_KEY` in `.env`
- **OpenAI** — set `OPENAI_API_KEY` or `GROQ_API_KEY`
- **Local LLM** — set `OLLAMA_URL`
- Falls back to template responses when no AI is configured

### Personality Modes

Five styles: **Friendly**, **Formal**, **Sarcastic**, **Enthusiastic**, **Wise**

### Feature Modes

| Mode          | Shortcut | Description                            |
| ------------- | -------- | -------------------------------------- |
| Web Search    | Button   | Live web search (DuckDuckGo / SerpAPI) |
| Thinking      | Button   | Step-by-step reasoning                 |
| Deep Research | Button   | Research-quality responses             |
| Study         | Button   | Teacher-style explanations             |
| Quizzes       | Button   | Auto-generated MCQ quizzes             |
| Voice         | Button   | **Full voice conversation**            |

### Voice Mode

Tap the microphone for continuous voice-in, voice-out conversations. The bot listens, thinks, and responds with spoken replies. Say "bye" or "goodbye" to exit. Supports all installed system voices.

### Image Generation

Ask the bot to "generate an image of..." or use the "Generate image" button. Supports:

- **DALL-E 3** (set `OPENAI_API_KEY`)
- **Leonardo.ai** (set `LEONARDO_API_KEY`)

### Plugin System

Built-in plugins:

- **Calculator** — evaluates math expressions
- **Wikipedia Lookup** — fetches summaries
- **Reminder** — sets timers ("remind me in 10 minutes")

Custom plugins: drop `.js` files in `plugins/` directory. See `plugins/README.md` for the API.

### Team Collaboration

Create teams, invite members by email, and share chats. Members see shared conversations in real-time via WebSocket.

### Slash Commands

`/new`, `/n` | `/search`, `/s` | `/clear`, `/c` | `/theme`, `/t` | `/help`, `/h`

Keyboard: `Ctrl+Shift+N`, `Ctrl+/`, `Esc`

### Other Features

- RAG-based knowledge with vector search
- Semantic chat search across all conversations
- Conversation branching (fork chats)
- Memory snapshots (LLM-generated summaries)
- Code execution sandbox (run JS in chat)
- PDF & PowerPoint upload
- JSON + Markdown export
- PWA (install-to-homescreen)
- Dark/Light themes
- Text-to-speech

## Environment Variables

```env
# AI (at least one)
GEMINI_API_KEY=         # Free at aistudio.google.com/apikey
OPENAI_API_KEY=         # OpenAI (also enables DALL-E image gen)
GROQ_API_KEY=           # Free Groq models
OLLAMA_URL=             # Local LLM

# Image Generation
LEONARDO_API_KEY=       # Leonardo.ai (alternative to DALL-E)
IMAGE_MODEL=dall-e-3    # or dall-e-2
IMAGE_SIZE=1024x1024

# Web Search
SERP_API_KEY=           # SerpAPI (optional, DuckDuckGo is free)

# Other
AUTH_PASSWORD=          # Enable login
JWT_SECRET=             # WebSocket auth secret
PORT=52738
```

## Project Structure

```
├── server.js            — Express + WebSocket server
├── src/
│   ├── llm.js          — LLM adapters (Gemini, OpenAI, Groq, Ollama)
│   ├── rag.js          — Vector search + RAG
│   ├── answering.js    — Answer generation pipeline
│   ├── kb.js           — Knowledge base
│   ├── websearch.js    — DuckDuckGo + SerpAPI search
│   ├── imagegen.js     — DALL-E + Leonardo.ai image gen
│   ├── plugins.js     — Plugin registry + built-in plugins
│   ├── websocket.js    — Real-time WebSocket server
│   ├── teams.js        — Team collaboration
│   ├── memory.js       — LLM-based conversation memory
│   ├── chatsearch.js    — Semantic chat search
│   ├── codeexec.js     — Sandboxed JS execution
│   ├── auth.js         — JWT authentication
│   ├── db.js            — SQLite persistence
│   └── *.js            — Utilities
├── plugins/            — Custom plugins (drop .js files here)
├── public/
│   ├── index.html       — Chat UI
│   ├── app.js           — Frontend client
│   ├── style.css        — Styles
│   ├── manifest.json    — PWA manifest
│   └── sw.js            — Service worker
├── data/                — SQLite DB, teams, vectors
└── tests/              — Unit tests
```

## Running Tests

```bash
npm test
```

## License

MIT
