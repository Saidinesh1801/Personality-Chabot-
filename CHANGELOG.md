# Changelog

## [3.0.0] — March 2026 — Major Upgrade

### New Features

- **Image Generation** — `src/imagegen.js` supports DALL-E 3 and Leonardo.ai. Bot detects image requests automatically ("generate an image of...") and shows inline results. Also available via "Generate image" button in feature menu.
- **Full Voice Conversation Mode** — Continuous voice-in, voice-out. Floating mic button, voice panel with waveform visualization, real-time transcript. Bot listens continuously, responds with TTS. Say "bye" to exit. `src/websocket.js` provides real-time WebSocket server for live features.
- **Plugin/Extension API** — `src/plugins.js` with a registry system. Built-in plugins: Calculator, Wikipedia Lookup, Reminder, Weather. Drop custom `.js` plugins into `plugins/` directory. Plugins are triggered by keywords in messages.
- **Team Collaboration** — `src/teams.js` with create teams, invite by email, share chats, member roles. Shared chats appear in team view. WebSocket broadcasts updates to all team members.
- **Real-time WebSocket** — `src/websocket.js` running on `/ws`. JWT auth, ping/pong keep-alive, broadcast chat events and user status. Used for team sync and typing indicators.

## [2.5.0] — March 2026 — Intelligence Upgrade

### New Features
- **Web Search Integration** — `src/websearch.js` provides DuckDuckGo and SerpAPI search, integrated into streaming responses via `/api/search`
- **Thinking Indicator** — Animated "Thinking..." label replaces generic dots during AI processing, with live updates ("Searching the web...", "Found 5 results...")
- **Streaming Cursor** — Subtle blinking cursor appears during slow responses to indicate active streaming
- **Scroll-to-Bottom Button** — Floating button appears when scrolled up, click to jump to latest message
- **Slash Commands** — `/new`, `/n`, `/search`, `/s`, `/clear`, `/c`, `/theme`, `/t`, `/help`, `/h` work in the chat input
- **Markdown Export** — Export individual chats as `.md` files alongside the full JSON backup
- **PWA Support** — `manifest.json` + `sw.js` for install-to-homescreen and offline caching
- **LLM Status Indicator** — Top-right badge shows "AI Ready" / "Template Mode" / "Offline" based on server health
- **ARIA Accessibility** — Added `role`, `aria-label`, `aria-expanded`, `aria-controls`, `aria-live` to all interactive elements

### Improvements
- Deep Research and Web Search modes now show real-time progress in the thinking indicator
- Keyboard shortcuts documented: `Ctrl+Shift+N`, `Ctrl+/`, `Esc`
- Feature menu closes properly on click-outside
- Service worker caches static assets for faster reloads
- Export dialog asks to also export current chat as Markdown

### Cleanup
- Removed `.bak` files (`app.js.bak`, `index.html.bak`, `style.css.bak`)
- Consolidated feature documentation into README
- Removed outdated claims about "as intelligent as ChatGPT/Gemini"

## [2.0.0] — January 2026 — Intelligence Upgrade

- Expanded knowledge base from ~50 to 177+ entries
- 4-tier intelligent matching (exact, partial, reverse, pattern-based)
- 5 personality modes with tone modifiers
- Safety guardrails and content filtering
- PDF and PowerPoint upload + text extraction
- SQLite-based server-side chat persistence
- Auth system with password protection
- Conversational patterns (small-talk, follow-ups)
- Readability analysis and simplification hints
- Relevance scoring for internal analysis
