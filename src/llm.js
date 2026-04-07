/**
 * @file LLM module - unified interface for all AI providers
 * @module src/llm
 */
const { callGemini } = require('./providers/gemini');
const { hasOpenAI, callOpenAI, callOpenAIWithHistory } = require('./providers/openai');
const { callLocalLLM, hasLocalLLM } = require('./providers/local');
const { getTemplateResponse } = require('./templates');

let generateAnswerFn = null;
let hasLLMFn = null;
let streamGenerateAnswerFn = null;

function setGenerateAnswer(fn) {
  generateAnswerFn = fn;
}

function setHasLLM(fn) {
  hasLLMFn = fn;
}

function setStreamGenerateAnswer(fn) {
  streamGenerateAnswerFn = fn;
}

function hasLLM() {
  if (hasLLMFn) return hasLLMFn();
  return hasOpenAI() || process.env.GEMINI_API_KEY || hasLocalLLM();
}

async function generateAnswer(query, context, history, personalityPrompt, options = {}) {
  const basePrompt =
    personalityPrompt || 'You are a knowledgeable, friendly, and helpful assistant.';
  const formatInstructions =
    ' Answer questions thoroughly and clearly. Use markdown formatting. Provide complete, detailed answers. When presenting data in rows and columns, ALWAYS use markdown table format like:\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Data 1   | Data 2   | Data 3   |\n\nDO NOT use spaces or dashes as substitutes for pipes in tables.';
  const contextInstructions =
    ' Use the provided context to answer accurately and concisely. Cite sources when available.';
  const imageInstructions =
    ' When the user uploads an image containing questions, analyze the image carefully and provide complete, direct answers.';

  let system = basePrompt + (context ? contextInstructions : formatInstructions);
  if (options.image) system += imageInstructions;

  const user = context
    ? `Question: ${query}\n\nContext:\n${context}\n\nProvide a detailed, complete answer.`
    : query;

  if (context) options.hasContext = true;

  // Try Gemini first
  const geminiResult = await callGemini(system, user, history, options);
  if (geminiResult && geminiResult.trim()) return { text: geminiResult };

  // Try OpenAI/Groq with higher token limit
  const openaiResult = await callOpenAI(system, user, { maxTokens: 8192 });
  if (openaiResult && openaiResult.trim()) return { text: openaiResult };

  // Try local LLM
  if (hasLocalLLM()) {
    const localResult = await callLocalLLM(system, user, { max_tokens: 8192 });
    if (localResult && localResult.trim()) return { text: localResult };
  }

  // Fallback to template
  return { text: getTemplateResponse(query) };
}

async function streamAnswer(
  query,
  context,
  history,
  systemPrompt,
  options,
  onChunk,
  onDone,
  onError
) {
  if (streamGenerateAnswerFn) {
    try {
      const result = await streamGenerateAnswerFn(query, context, history, systemPrompt, options);

      // Handle successful response with text
      if (result && result.text && result.text.trim()) {
        const text = result.text.trim();
        const words = text.split(' ');

        for (let i = 0; i < words.length; i++) {
          if (!words[i] && words[i] !== '') continue; // Skip empty words
          onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
          // Variable delay based on content length - longer delays for longer responses
          const delay = Math.min(20 + text.length / 100, 50);
          await new Promise((r) => setTimeout(r, delay));
        }
        onDone();
        return;
      }

      // Handle empty response - try to continue or provide fallback
      console.warn('[LLM] Empty response, attempting fallback');
    } catch (err) {
      console.error('[LLM] Stream error:', err.message);
      onError(err);
      return;
    }
  }

  // Final fallback - try template response
  const { getTemplateResponse } = require('./templates');
  const fallback = getTemplateResponse(query);
  if (fallback) {
    const words = fallback.split(' ');
    for (let i = 0; i < words.length; i++) {
      onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
      await new Promise((r) => setTimeout(r, 20));
    }
    onDone();
    return;
  }

  onError(new Error('No response could be generated'));
}

function buildFullPrompt(query, personality, options = {}) {
  const personalityPrompt = personality || 'You are a helpful assistant.';
  let prompt = personalityPrompt;

  if (options.mode === 'thinking') {
    prompt += ' Take your time to think through this step by step. Show your reasoning process.';
  } else if (options.mode === 'deep-research') {
    prompt +=
      ' Provide a comprehensive, well-researched answer with multiple perspectives and references.';
  }

  prompt += ' Use markdown formatting for clarity.';

  if (options.pdfContext) {
    prompt += ' The user has uploaded a document. Answer questions based on its content.';
  }

  return prompt;
}

module.exports = {
  generateAnswer,
  streamAnswer,
  hasLLM,
  buildFullPrompt,
  setGenerateAnswer,
  setHasLLM,
  setStreamGenerateAnswer,
  callGemini,
  callOpenAI,
  callLocalLLM,
};
