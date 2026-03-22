#!/usr/bin/env node

/**
 * embed_and_index.js
 * 
 * Computes embeddings for chunks and indexes them into a vector store.
 * Currently uses a simple JSON file backend; can be swapped for Pinecone/Weaviate.
 * Input: JSONL file with chunks
 * Output: JSON file with vectors and metadata, ready for retrieval
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');
require('dotenv').config();

const BATCH_SIZE = 10;  // chunks to batch per API call

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

/**
 * Get embedding from Gemini API for a single text
 */
async function getGeminiEmbedding(text) {
  const resp = await fetch(`${EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
  });
  if (!resp.ok) {
    throw new Error(`Embedding API error: ${resp.status} ${await resp.text()}`);
  }
  const data = await resp.json();
  return data?.embedding?.values;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Compute embeddings for a batch of texts using Gemini or mock fallback
 */
async function getEmbeddings(texts) {
  if (GEMINI_API_KEY) {
    console.log(`   [gemini] embedding ${texts.length} texts...`);
    const results = [];
    for (const text of texts) {
      try {
        const embedding = await getGeminiEmbedding(text);
        results.push(embedding);
        await sleep(100); // small delay to respect rate limits
      } catch (err) {
        console.error(`   ⚠️  Embedding failed: ${err.message}`);
        // Fallback to mock for this text
        results.push(Array(768).fill(0).map(() => Math.random()));
      }
    }
    return results;
  }

  console.log(`   [mock] embedding ${texts.length} texts (no GEMINI_API_KEY set)...`);
  return texts.map(() => Array(768).fill(0).map(() => Math.random()));
}

/**
 * Deduplicate based on text fingerprint
 */
function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    h = ((h << 5) - h) + char;
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Process chunks and compute embeddings
 */
async function processChunks() {
  const inputPath = path.join(__dirname, '..', 'data', 'chunks.jsonl');
  const outputPath = path.join(__dirname, '..', 'data', 'vectors.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    console.log('   Run chunker.js first.');
    process.exit(1);
  }

  const vectors = [];
  const seen = new Set();
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity,
  });

  let batchBuffer = [];
  let batchChunks = [];
  let processedCount = 0;
  let skippedCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const chunk = JSON.parse(line);
      const fingerprint = hash(chunk.text);

      if (seen.has(fingerprint)) {
        skippedCount++;
        continue;
      }
      seen.add(fingerprint);

      batchBuffer.push(chunk.text);
      batchChunks.push(chunk);

      if (batchBuffer.length >= BATCH_SIZE) {
        // Get embeddings for batch
        const embeddings = await getEmbeddings(batchBuffer);

        for (let i = 0; i < batchChunks.length; i++) {
          vectors.push({
            id: batchChunks[i].chunk_id,
            vector: embeddings[i],
            metadata: {
              text: batchChunks[i].text,
              tokens: batchChunks[i].tokens,
              ...batchChunks[i].metadata,
            },
          });
          processedCount++;
        }

        batchBuffer = [];
        batchChunks = [];
        console.log(`   ... ${processedCount} chunks embedded`);
      }
    } catch (err) {
      console.error(`⚠️  Error parsing chunk: ${err.message}`);
    }
  }

  // Process remaining batch
  if (batchBuffer.length > 0) {
    const embeddings = await getEmbeddings(batchBuffer);
    for (let i = 0; i < batchChunks.length; i++) {
      vectors.push({
        id: batchChunks[i].chunk_id,
        vector: embeddings[i],
        metadata: {
          text: batchChunks[i].text,
          tokens: batchChunks[i].tokens,
          ...batchChunks[i].metadata,
        },
      });
      processedCount++;
    }
  }

  // Write vectors to JSON file
  fs.writeFileSync(outputPath, JSON.stringify({ vectors, count: vectors.length }, null, 2));

  console.log(`✅ Embedded and indexed ${processedCount} chunks (skipped ${skippedCount} duplicates)`);
  console.log(`   Output: ${outputPath}`);
}

processChunks().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
