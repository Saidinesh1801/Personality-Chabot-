const { generateAnswer } = require('./llm');

const SUMMARIZE_PROMPT = `You are a chat memory compressor. Given a conversation, extract and summarize the key information that should be remembered for future conversations with this user. Focus on:
1. User's interests, preferences, and goals
2. Important facts about the user
3. Ongoing projects or topics they're working on
4. Technical context (languages, frameworks, tools they use)
5. Anything they'd want you to remember

Keep the summary concise (2-4 sentences max). Return ONLY the summary, no preamble.`;

const EMBED_SUMMARIES = new Map();

function summarizeConversation(messages) {
  const text = messages.map(m => `${m.role}: ${m.text}`).join('\n');
  if (!text) return null;

  const hash = text.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
  return hash;
}

async function generateMemorySummary(messages, userId) {
  if (!messages || !Array.isArray(messages) || messages.length < 4) return null;
  if (messages.length > 100) {
    messages = messages.slice(-100);
  }

  const text = messages.map(m => `${m.role}: ${m.text}`).join('\n');
  if (!text) return null;

  const cacheKey = `${userId || 'anon'}_${summarizeConversation(messages)}`;

  try {
    const result = await generateAnswer(
      `Please summarize the following conversation for future context:\n\n${text}`,
      null, [], SUMMARIZE_PROMPT, {}
    );
    if (result && result.text) {
      EMBED_SUMMARIES.set(cacheKey, result.text.trim());
      return result.text.trim();
    }
  } catch (err) {
    // Summary generation failed, return null
  }
  return null;
}

function getMemorySummary(userId, messages) {
  if (!messages || messages.length === 0) return null;
  const key = `${userId || 'anon'}_${summarizeConversation(messages)}`;
  return EMBED_SUMMARIES.get(key) || null;
}

function buildMemoryPrompt(userId, messages) {
  if (!messages || messages.length === 0) return '';
  const summary = getMemorySummary(userId, messages);
  if (!summary) return '';
  return `Previous conversation context you should remember:\n"${summary}"\n\nUse this context to provide more personalized and relevant responses.`;
}

async function createMemorySnapshot(userId, messages) {
  return await generateMemorySummary(messages, userId);
}

module.exports = {
  generateMemorySummary,
  getMemorySummary,
  buildMemoryPrompt,
  createMemorySnapshot,
};
