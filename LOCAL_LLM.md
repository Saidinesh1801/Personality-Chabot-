Local LLM Integration (Ollama / Local HTTP models)

Overview
- If you don't want to use a paid API, run a local model (Ollama, llama.cpp, gpt4all, etc.).
- This project supports calling a local HTTP endpoint via `LOCAL_LLM_URL`.

Recommended: Ollama (easy)
1. Install Ollama: https://ollama.ai/docs
2. Run a model: `ollama run llama2` or similar (follow Ollama docs).
3. Ollama exposes a local HTTP API at `http://localhost:11434` by default.

Config
- In your `.env` set:
  LOCAL_LLM_URL=http://localhost:11434
  LOCAL_LLM_MODEL=your-model-name

How server uses it
- When `OPENAI_API_KEY` is not present, `server.js` will try OpenAI first, then the `LOCAL_LLM_URL`.
- The code will POST a small JSON payload with `messages` to common endpoints (`/v1/chat/completions`, `/api/chat`, or the base URL).
- The server expects a variety of response shapes and will extract message text where possible.

Notes and troubleshooting
- Different local runtimes have different APIs. If your runtime uses a different route, set `LOCAL_LLM_URL` to the exact URL that accepts chat-style JSON.
- If you get no response, check the model process is running and reachable (curl `LOCAL_LLM_URL`).
- For best results, run a capable model (Llama 2, Mistral, etc.) and set `LOCAL_LLM_MODEL` to the model name where required by your runtime.

Example (curl to Ollama):
```
curl -X POST "http://localhost:11434/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama2","messages":[{"role":"user","content":"Hello"}]}'
```

If you want, I can add a small `scripts/run_local_test.js` to detect and validate your local endpoint — say "add test" and I'll create it.