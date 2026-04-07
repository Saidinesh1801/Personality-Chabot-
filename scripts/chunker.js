#!/usr/bin/env node

/**
 * chunker.js
 *
 * Splits documents into passages (chunks) with overlap.
 * Input: JSONL file with {id, text, metadata}
 * Output: JSONL file with {chunk_id, text, tokens, metadata}
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const CHUNK_SIZE = 500; // tokens per chunk (approximate)
const OVERLAP = 50; // overlap tokens

/**
 * Rough token count (splits on whitespace; not precise)
 */
function countTokens(text) {
  return text.split(/\s+/).length;
}

/**
 * Split text into chunks with overlap
 */
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = OVERLAP) {
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

/**
 * Process documents and chunk them
 */
async function processDocuments() {
  const inputPath = path.join(__dirname, '..', 'data', 'documents.jsonl');
  const outputPath = path.join(__dirname, '..', 'data', 'chunks.jsonl');

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    console.log('   Run fetch_and_extract.js first.');
    process.exit(1);
  }

  const outputStream = fs.createWriteStream(outputPath);
  let chunkCounter = 0;
  let docCounter = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const doc = JSON.parse(line);
      const chunks = chunkText(doc.text);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = {
          chunk_id: `${doc.id}_chunk_${i}`,
          doc_id: doc.id,
          text: chunks[i],
          tokens: countTokens(chunks[i]),
          chunk_index: i,
          metadata: {
            ...doc.metadata,
            parent_doc_id: doc.id,
          },
        };
        outputStream.write(JSON.stringify(chunk) + '\n');
        chunkCounter++;
      }
      docCounter++;
    } catch (err) {
      console.error(`⚠️  Error parsing line: ${err.message}`);
    }
  }

  outputStream.end();

  console.log(`✅ Chunked ${docCounter} documents into ${chunkCounter} chunks`);
  console.log(`   Output: ${outputPath}`);
}

processDocuments().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
