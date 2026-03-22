#!/usr/bin/env node
"use strict";

// run_local_test.js
// Tries to detect and validate a local LLM HTTP endpoint (Ollama, llama.cpp frontends, etc.)

const DEFAULT_URLS = [
  'http://localhost:11434/api/chat',   // Ollama default
  'http://localhost:11434/v1/chat/completions',
  'http://localhost:11434/v1/completions',
  'http://localhost:8080/v1/chat/completions',
  'http://localhost:8000/api/chat',
  'http://localhost:8000/v1/chat/completions',
  'http://localhost:5000/api/chat',
  'http://localhost:5000/v1/chat/completions',
  'http://localhost:11434',
];

const envUrl = process.env.LOCAL_LLM_URL || process.env.OLLAMA_URL || null;
const tryUrls = envUrl ? [envUrl, ...DEFAULT_URLS] : DEFAULT_URLS;

async function probeUrl(url) {
  try {
    const payload = {
      model: process.env.LOCAL_LLM_MODEL || process.env.OLLAMA_MODEL || 'test-model',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in one short sentence.' }
      ],
      temperature: 0.2,
      max_tokens: 64,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (err) {
    return { ok: false, err: err && err.message };
  }
}

(async () => {
  console.log('Local LLM detection script');
  if (envUrl) console.log('Using LOCAL_LLM_URL from env:', envUrl);

  for (const url of tryUrls) {
    process.stdout.write(`Probing ${url} ... `);
    const r = await probeUrl(url);
    if (r.ok) {
      console.log(`OK (status ${r.status})`);
      console.log('Response (truncated):', r.body.slice(0, 800));
      console.log('\nSUCCESS: Local LLM endpoint detected at:', url);
      process.exit(0);
    } else {
      if (r.status) console.log(`HTTP ${r.status}`);
      else console.log(`FAILED (${r.err || 'no response'})`);
    }
  }

  console.log('\nNo local LLM endpoints detected from tried list.');
  console.log('Set LOCAL_LLM_URL to your local model endpoint and try again.');
  process.exit(2);
})();
