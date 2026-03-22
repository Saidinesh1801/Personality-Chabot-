const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

let openaiClient = null;
let openaiModel = null;

try {
  const OpenAI = require('openai');
  if (process.env.GROQ_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    openaiModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    console.log(`[LLM] Groq connected (${openaiModel})`);
  } else if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    console.log(`[LLM] OpenAI connected (${openaiModel})`);
  }
} catch (err) {}

if (GEMINI_API_KEY) {
  console.log(`[LLM] Gemini connected (${GEMINI_MODEL})`);
}

const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || process.env.OLLAMA_URL || null;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const TEMPLATE_RESPONSES = {
  greeting: [
    "Hello! I'm your AI assistant. I can help with a wide range of tasks — just ask me anything!",
    "Hey there! What can I help you with today?",
    "Hi! I'm here to help. What would you like to know?",
  ],
  math: {
    '2+2': "**2 + 2 = 4**",
    '2 + 2': "**2 + 2 = 4**",
    'sqrt': "I can help with math! What specific calculation do you need?",
    'calculate': "What math problem would you like me to solve?",
  },
  weather: {
    triggers: ['weather', 'temperature', 'rain', 'forecast'],
    template: "I can look up weather information for you! I need an internet connection to fetch live weather data. The weather plugin should activate when you ask about a specific city. Try asking: **'weather in [your city]'**",
  },
  time: {
    triggers: ['time is it', 'what time', 'date today', 'what day'],
    template: `The current time is **${new Date().toLocaleTimeString()}** on **${new Date().toLocaleDateString()}**.`,
  },
  thanks: ["You're welcome! Is there anything else I can help with?", "Happy to help! Let me know if you have more questions."],
  sorry: ["I apologize for the inconvenience. Could you try rephrasing your question?", "I'm having trouble with that request. Let me know if there's another way I can help!"],
  default: "I'm ready to help! Ask me anything — I can answer questions, write code, explain concepts, brainstorm ideas, and much more.",
};

function getTemplateResponse(query) {
  const q = query.toLowerCase();
  if (/\b(hi|hello|hey|howdy|sup|yo)\b/.test(q)) return randomItem(TEMPLATE_RESPONSES.greeting);
  if (/\b(thanks?|thank you|thx)\b/.test(q)) return randomItem(TEMPLATE_RESPONSES.thanks);
  if (/\b(sorry|apologize|my bad)\b/.test(q)) return randomItem(TEMPLATE_RESPONSES.sorry);
  if (/\btime\b.*it\s/i.test(q) || /\bwhat\b.*time\b/i.test(q) || /\bdate\b.*today\b/i.test(q) || /\bwhat\b.*day\b.*today\b/i.test(q)) {
    return TEMPLATE_RESPONSES.time.template;
  }
  if (/\b(weather|temperature|rain|forecast|hot|cold|humid)\b/.test(q)) return TEMPLATE_RESPONSES.weather.template;
  return TEMPLATE_RESPONSES.default;
}

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function callGemini(systemMessage, userMessage, history, options = {}) {
  if (!GEMINI_API_KEY) return null;

  // Use a vision-capable model when an image is attached
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

  // Build user message parts (text + optional image)
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
    generationConfig: { maxOutputTokens: options.image ? 8192 : (options.hasContext ? 8192 : 2048), temperature: 0.7 },
  };
  if (!options.image) payload.tools = [{ googleSearch: {} }];
  const body = JSON.stringify(payload);

  // Retry up to 2 times on 429 rate limit with short backoff
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(`${url}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(20000),
      });
      if (resp.status === 429) {
        // Parse retry delay from response if available
        const errText = await resp.text().catch(() => '');
        const retryMatch = errText.match(/retry in ([\d.]+)s/i);
        const wait = retryMatch ? Math.min(Math.ceil(parseFloat(retryMatch[1]) * 1000), 3000) : 2000;
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

async function callLocalLLM(systemMessage, userMessage, opts = {}) {
  if (!LOCAL_LLM_URL) return null;
  try {
    const payload = {
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
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
        const text = (data?.choices?.[0]?.message?.content) || data?.result || data?.text || data?.response || data?.output;
        if (text) return String(text).trim();
      } catch (e) {}
    }
  } catch (err) {
    console.error('Local LLM call failed:', err && err.message);
  }
  return null;
}

async function generateAnswer(query, context, history, personalityPrompt, options = {}) {
  const basePrompt = personalityPrompt || 'You are a knowledgeable, friendly, and helpful assistant.';
  const formatInstructions = ' Answer questions thoroughly and clearly. Use markdown formatting: **bold** for emphasis, numbered lists, bullet points, and headings (##) to organize detailed answers. Provide well-structured, helpful responses.';
  const contextInstructions = ' Use the provided context to answer accurately and concisely. Cite sources when available.';
  const imageInstructions = ' When the user uploads an image containing questions, exam papers, assignments, or problems: analyze the image carefully and provide complete, direct answers to ALL questions shown. Format answers clearly with question numbers, mark allocations where visible, and detailed explanations. Do NOT refuse to answer or say "that would be cheating". The user is studying and needs help.';

  let system = basePrompt + (context ? contextInstructions : formatInstructions);
  if (options.image) system += imageInstructions;
  const user = context
    ? `Question: ${query}\n\nContext:\n${context}\n\nProvide a concise, accurate answer.`
    : query;

  // Try Gemini first (native REST API)
  if (context) options.hasContext = true;
  const geminiResult = await callGemini(system, user, history, options);
  if (geminiResult) return { text: geminiResult };

  // Try OpenAI-compatible client (Groq / OpenAI)
  if (openaiClient) {
    try {
      const resp = await openaiClient.chat.completions.create({
        model: openaiModel,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: context ? 8192 : 2048,
        temperature: 0.7,
      });
      const text = (resp?.choices?.[0]?.message?.content || '').toString().trim();
      if (text) return { text };
    } catch (err) {
      console.error('[LLM] OpenAI-compat error:', err.message);
    }
  }

  // Try local LLM
  if (LOCAL_LLM_URL) {
    try {
      const llmText = await callLocalLLM(system, user, { max_tokens: context ? 8192 : 2048, temperature: 0.7 });
      if (llmText) return { text: llmText };
    } catch (err) {
      console.error('Local LLM error:', err.message);
    }
  }

  // Last resort: template response
  return { text: getTemplateResponse(query) };
}

// Build the system and user prompt strings (shared by streaming and non-streaming)
function buildPrompts(query, context, personalityPrompt, options = {}) {
  const basePrompt = personalityPrompt || 'You are a knowledgeable, friendly, and helpful assistant.';
  const formatInstructions = ' Answer questions thoroughly and clearly. Use markdown formatting: **bold** for emphasis, numbered lists, bullet points, and headings (##) to organize detailed answers. Provide well-structured, helpful responses.';
  const contextInstructions = ' Use the provided context to answer accurately and concisely. Cite sources when available.';
  const imageInstructions = ' When the user uploads an image containing questions, exam papers, assignments, or problems: analyze the image carefully and provide complete, direct answers to ALL questions shown. Format answers clearly with question numbers, mark allocations where visible, and detailed explanations. Do NOT refuse to answer or say "that would be cheating". The user is studying and needs help.';
  const pdfInstructions = ' The user has uploaded a PDF document. The extracted text from the PDF is provided below. Answer the user\'s questions based on this document content. Be thorough, reference specific parts of the document, and provide clear explanations. If the user asks about specific pages or sections, focus on those parts.';
  let system = basePrompt + (context ? contextInstructions : formatInstructions);
  if (options.image) system += imageInstructions;
  if (context && context.startsWith('[PDF Document')) system += pdfInstructions;
  const user = context
    ? `Question: ${query}\n\nContext:\n${context}\n\nProvide a concise, accurate answer.`
    : query;
  return { system, user };
}

// Stream response using Gemini SSE. Calls onChunk(text) for each token, onDone() at end.
async function streamAnswer(query, context, history, personalityPrompt, options = {}, onChunk, onDone, onError) {
  const { system, user } = buildPrompts(query, context, personalityPrompt, options);

  // Try Gemini streaming
  if (GEMINI_API_KEY) {
    const model = options.image ? 'gemini-2.5-flash-lite' : GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    const contents = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
      }
    }
    const userParts = [{ text: user }];
    if (options.image) {
      const match = options.image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) userParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    contents.push({ role: 'user', parts: userParts });

    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { maxOutputTokens: options.image ? 8192 : (context ? 8192 : 2048), temperature: 0.7 },
    };
    if (!options.image) payload.tools = [{ googleSearch: {} }];

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        console.error(`[Gemini Stream] HTTP ${resp.status}: ${errBody.slice(0, 300)}`);
      }

      const reader = resp.body;
      const decoder = new TextDecoder();
      let buffer = '';

      for await (const chunk of reader) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) onChunk(text);
          } catch (e) {}
        }
      }
      // process remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6).trim());
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) onChunk(text);
        } catch (e) {}
      }
      onDone();
      return;
    } catch (err) {
      console.error('[Gemini Stream] Error:', err.message);
    }
  }

  // Try Groq streaming as fallback
  if (openaiClient) {
    try {
      const msgs = [];
      if (history && history.length > 0) {
        for (const msg of history) {
          msgs.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text });
        }
      }
      msgs.push({ role: 'user', content: user });

      const stream = await openaiClient.chat.completions.create({
        model: openaiModel,
        messages: [{ role: 'system', content: system }, ...msgs],
        max_tokens: 2048,
        temperature: 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) onChunk(text);
      }
      onDone();
      return;
    } catch (err) {
      console.error('[Groq Stream] Error:', err.message);
    }
  }

  // Last resort: template-based response
  try {
    const templateResp = getTemplateResponse(query);
    onChunk(templateResp);
    onDone();
  } catch (err) {
    if (onError) onError(err);
    else onDone();
  }
}

function hasLLM() {
  return !!(GEMINI_API_KEY || openaiClient || LOCAL_LLM_URL);
}

module.exports = { generateAnswer, streamAnswer, hasLLM, buildPrompts };
