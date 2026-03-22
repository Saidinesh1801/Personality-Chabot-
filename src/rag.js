const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

let vectorStore = { vectors: [] };
try {
  const vectorPath = path.join(__dirname, '..', 'data', 'vectors.json');
  if (fs.existsSync(vectorPath)) {
    vectorStore = JSON.parse(fs.readFileSync(vectorPath, 'utf8'));
  }
} catch (err) {
  console.log('Vector store not found; RAG retrieval skipped. Run "npm run ingest:all" to generate vectors.');
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * (vecB[i] || 0), 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return normA > 0 && normB > 0 ? dotProduct / (normA * normB) : 0;
}

// Cache for query embeddings to avoid repeat API calls
const embeddingCache = new Map();

async function getGeminiEmbedding(text) {
  if (!GEMINI_API_KEY) return null;

  const cacheKey = text.slice(0, 200);
  if (embeddingCache.has(cacheKey)) return embeddingCache.get(cacheKey);

  try {
    const resp = await fetch(`${EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
      }),
    });
    if (!resp.ok) {
      console.error(`[RAG] Embedding API error: ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    const embedding = data?.embedding?.values;
    if (embedding) {
      embeddingCache.set(cacheKey, embedding);
      if (embeddingCache.size > 100) {
        const firstKey = embeddingCache.keys().next().value;
        embeddingCache.delete(firstKey);
      }
    }
    return embedding || null;
  } catch (err) {
    console.error('[RAG] Embedding error:', err.message);
    return null;
  }
}

function getMockEmbedding(text) {
  const hash = text.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
  const seed = Math.abs(hash);
  const rng = (i) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };
  return Array(768).fill(0).map((_, i) => rng(i) * 2 - 1);
}

async function getEmbedding(text) {
  const real = await getGeminiEmbedding(text);
  if (real) return real;
  return getMockEmbedding(text);
}

async function retrieveRAG(query, topK = 3) {
  if (!vectorStore.vectors || vectorStore.vectors.length === 0) {
    return [];
  }

  const queryVec = await getEmbedding(query);
  const scored = vectorStore.vectors.map(vec => ({
    text: vec.metadata.text,
    metadata: vec.metadata,
    score: cosineSimilarity(queryVec, vec.vector),
  }));
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

async function answerWithRAG(query, generateAnswer) {
  const retrieved = await retrieveRAG(query, 3);

  if (retrieved.length === 0 || retrieved[0].score < 0.4) {
    return await generateAnswer(query, null);
  }

  const context = retrieved
    .map((p, i) => `[Passage ${i + 1}] ${p.text}`)
    .join('\n\n');

  const sources = retrieved.map(p => p.metadata.url || 'Internal').filter((v, i, a) => a.indexOf(v) === i);

  const answer = await generateAnswer(query, context);
  if (answer) {
    return { ...answer, source: sources[0] || null, confidence: retrieved[0].score };
  }

  return {
    text: retrieved[0].text,
    source: sources[0] || null,
    confidence: retrieved[0].score,
  };
}

module.exports = { answerWithRAG, retrieveRAG, cosineSimilarity, getEmbedding, getGeminiEmbedding, getMockEmbedding };
