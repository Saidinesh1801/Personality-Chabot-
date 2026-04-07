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

function hasOpenAI() {
  return openaiClient !== null;
}

async function callOpenAI(system, user, options = {}) {
  if (!openaiClient) {
    console.log('[LLM] No OpenAI client available');
    return null;
  }

  console.log('[LLM] Calling OpenAI/Groq API...');

  try {
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];

    const resp = await openaiClient.chat.completions.create({
      model: openaiModel,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    });

    const text = (resp?.choices?.[0]?.message?.content || '').toString().trim();
    if (text) {
      console.log('[LLM] Got response from OpenAI/Groq:', text.slice(0, 100));
      return text;
    }
  } catch (err) {
    console.error('[LLM] OpenAI-compat error:', err.message);
  }
  return null;
}

async function callOpenAIWithHistory(system, history, options = {}) {
  if (!openaiClient) return null;

  try {
    const messages = [{ role: 'system', content: system }];
    history.forEach((msg) => {
      messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text });
    });

    const resp = await openaiClient.chat.completions.create({
      model: openaiModel,
      messages,
      max_tokens: options.maxTokens || 4096, // Increased from 2048
      temperature: options.temperature || 0.7,
    });

    const text = (resp?.choices?.[0]?.message?.content || '').toString().trim();
    if (text) return text;
  } catch (err) {
    console.error('[LLM] OpenAI history error:', err.message);
  }
  return null;
}

module.exports = { openaiClient, openaiModel, hasOpenAI, callOpenAI, callOpenAIWithHistory };
