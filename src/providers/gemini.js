const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(systemMessage, userMessage, history, options = {}) {
  if (!GEMINI_API_KEY) return null;

  const model = options.image ? 'gemini-2.5-flash-lite' : GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const contents = [];
  if (history && history.length > 0) {
    for (const msg of history) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      });
    }
  }

  const userParts = [{ text: userMessage }];
  if (options.image) {
    const match = options.image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      userParts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }
  contents.push({ role: 'user', parts: userParts });

  const payload = {
    systemInstruction: { parts: [{ text: systemMessage }] },
    contents,
    generationConfig: {
      maxOutputTokens: options.image ? 8192 : options.hasContext ? 8192 : 2048,
      temperature: 0.7,
    },
  };
  if (!options.image) payload.tools = [{ googleSearch: {} }];
  const body = JSON.stringify(payload);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(`${url}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(30000),
      });

      if (resp.status === 429) {
        const retryMatch = resp.headers.get('Retry-After')?.match(/(\d+)/);
        const wait = retryMatch
          ? Math.min(Math.ceil(parseFloat(retryMatch[1]) * 1000), 3000)
          : 2000;
        console.log(`[Gemini] Rate limited, retrying in ${wait}ms...`);
        await sleep(wait);
        continue;
      }
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        console.error(`[Gemini] HTTP ${resp.status}: ${errBody.slice(0, 300)}`);
        return null;
      }
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text ? text.trim() : null;
    } catch (err) {
      console.error('[Gemini] Error:', err.message);
      return null;
    }
  }
  console.error('[Gemini] All retries exhausted');
  return null;
}

module.exports = { callGemini, GEMINI_API_KEY };
