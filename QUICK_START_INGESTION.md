# Quick Start: Ingestion Pipeline

This guide walks you through fetching, chunking, and embedding documents into a vector store.

## Setup

### 1. Install optional dependencies

```bash
npm install --save-optional openai @pinecone-database/pinecone weaviate-ts-client
```

### 2. Create `.env` file

```bash
# Embedding provider choices: openai | cohere | local
EMBEDDING_PROVIDER=openai

# If using OpenAI embeddings
OPENAI_API_KEY=sk-xxx...

# Vector store choices: pinecone | weaviate | faiss | json
VECTOR_DB=json

# Optional: If using Pinecone
PINECONE_API_KEY=xxx...
PINECONE_ENV=gcp-starter

# Optional: If using Weaviate (self-hosted or cloud)
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=xxx...
```

## Running the pipeline

### Option A: Run all steps at once

```bash
npm run ingest:all
```

This runs:
1. `fetch_and_extract.js` → downloads/parses datasets → `data/documents.jsonl`
2. `chunker.js` → splits into passages → `data/chunks.jsonl`
3. `embed_and_index.js` → computes embeddings → `data/vectors.json`

### Option B: Run steps individually

```bash
# Step 1: Fetch and extract documents
npm run ingest:fetch
# Output: data/documents.jsonl

# Step 2: Chunk documents
npm run ingest:chunk
# Output: data/chunks.jsonl

# Step 3: Embed and index
npm run ingest:embed
# Output: data/vectors.json
```

## What happens

1. **Fetch & Extract**: Collects documents from Wikipedia, books, StackExchange, etc. with metadata (source URL, license, date).
2. **Chunker**: Splits long documents into ~500-token passages with 50-token overlap to preserve context.
3. **Embed & Index**: Calls embedding API (currently mock; replace with real OpenAI/Cohere/local) and stores vectors + metadata in JSON file.

## Output files

- `data/documents.jsonl` — raw documents with metadata
- `data/chunks.jsonl` — chunked passages
- `data/vectors.json` — vectors and metadata, ready for retrieval

## Next steps

1. Modify `scripts/fetch_and_extract.js` to add real dataset URLs (Wikipedia dump, OpenLibrary, StackExchange).
2. Replace the mock `getEmbeddings()` in `embed_and_index.js` with a real API call (OpenAI example below).
3. Integrate the vector store into `server.js` for RAG-based retrieval.

### Example: Real OpenAI embedding call

```javascript
// In embed_and_index.js, replace getEmbeddings():
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getEmbeddings(texts) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map(d => d.embedding);
}
```

## Troubleshooting

- **"Input file not found"**: Make sure you ran the previous step. Run `npm run ingest:all` to start from scratch.
- **Rate limit errors**: Add backoff/retry logic and increase `BATCH_SIZE` or add delays between batches.
- **Large datasets timeout**: Stream into database instead of collecting in memory.

---

For more details, see [INGESTION_PLAN.md](INGESTION_PLAN.md).
