const db = require('./db');
const { getEmbedding } = require('./rag');

const searchCache = new Map();

async function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function textToVec(text) {
  const words = (text || '').toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  const vec = new Array(512).fill(0);
  let i = 0;
  const keys = Object.keys(freq).sort();
  for (const k of keys) {
    vec[i++ % 512] += freq[k];
    if (i >= keys.length * 2) break;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vec.map(v => v / norm) : vec;
}

async function searchChats(userId, query, topK = 5) {
  if (!query || !query.trim()) return [];

  const cacheKey = `${userId}_${query}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);

  let results = [];

  const chats = db.getAllChats(userId);
  if (!chats || chats.length === 0) return [];

  const queryVec = textToVec(query);
  let embeddingVec = null;
  try {
    const emb = await getEmbedding(query);
    if (emb && emb.length === 768) embeddingVec = emb;
  } catch (e) {}

  for (const chat of chats) {
    const fullChat = db.getChat(chat.id, userId);
    if (!fullChat || !fullChat.messages || fullChat.messages.length === 0) continue;

    const combinedText = fullChat.messages.map(m => m.text).join(' ');
    const chatVec = textToVec(combinedText);

    let score = cosineSim(queryVec, chatVec);

    if (embeddingVec) {
      const embScore = cosineSim(embeddingVec, textToVec(combinedText));
      score = Math.max(score, embScore * 0.8);
    }

    const words = query.toLowerCase().split(/\s+/);
    const chatLower = combinedText.toLowerCase();
    const wordMatches = words.filter(w => chatLower.includes(w)).length;
    const keywordBoost = words.length > 0 ? (wordMatches / words.length) * 0.3 : 0;

    score = Math.min(1, score + keywordBoost);

    if (score > 0.1) {
      const lastMsg = fullChat.messages[fullChat.messages.length - 1];
      results.push({
        chatId: chat.id,
        title: chat.title,
        score: Math.round(score * 100) / 100,
        snippet: lastMsg ? lastMsg.text.slice(0, 200) : '',
        msgCount: fullChat.messages.length,
        date: chat.updated_at,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  results = results.slice(0, topK);

  searchCache.set(cacheKey, results);
  if (searchCache.size > 100) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }

  return results;
}

module.exports = { searchChats };
