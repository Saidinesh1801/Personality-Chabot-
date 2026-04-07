const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || process.env.OLLAMA_URL || null;

async function callLocalLLM(systemMessage, userMessage, opts = {}) {
  if (!LOCAL_LLM_URL) return null;
  try {
    const payload = {
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      max_tokens: opts.max_tokens || 2048,
      temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
    };
    const base = LOCAL_LLM_URL.replace(/\/$/, '');
    const tryUrls = [`${base}/v1/chat/completions`, `${base}/api/chat`, base];
    for (const url of tryUrls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text =
          data?.choices?.[0]?.message?.content ||
          data?.result ||
          data?.text ||
          data?.response ||
          data?.output;
        if (text) return String(text).trim();
      } catch (e) {}
    }
  } catch (err) {
    console.error('Local LLM call failed:', err && err.message);
  }
  return null;
}

function hasLocalLLM() {
  return LOCAL_LLM_URL !== null;
}

module.exports = { callLocalLLM, hasLocalLLM, LOCAL_LLM_URL };
