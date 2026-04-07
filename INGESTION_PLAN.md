Ingestion & Embedding Pipeline Plan

Goal

- Build a repeatable pipeline to ingest large corpora, split into passages, compute embeddings, and index into a vector store for RAG.

Datasets to collect (priority order)

1. Wikipedia (latest dumps) — broad factual coverage
2. CommonCrawl / CC-News subsets — general web knowledge and news
3. Books/meta (Project Gutenberg, OpenLibrary bulk) — literature
4. StackExchange / GitHub public datasets — technical Q&A and code
5. Media metadata (OMDb/TMDb dumps, MusicBrainz, TheSportsDB) — media facts
6. Domain corpora as needed (medical, legal) — add carefully with licensing review

Preprocessing steps

- Download raw data (keep source metadata)
- Normalize text (NFC, remove nulls)
- Clean HTML and boilerplate
- Split into passages (recommended 500–1000 tokens, overlap 20%)
- Extract and store metadata: source URL, title, publication date, license
- Deduplicate using fingerprint (minhash or SHA256 of normalized passage)

Embeddings & Vector Store choices

- Embedding providers: OpenAI embeddings, Cohere embeddings, HuggingFace/ONNX local models
- Vector databases: Pinecone (managed), Weaviate (open), Milvus (self-hosted), FAISS (local)

Env variables (examples)

- EMBEDDING_PROVIDER=openai|cohere|local
- OPENAI_API_KEY=
- COHERE_API_KEY=
- VECTOR_DB=pinecone|weaviate|milvus|faiss
- PINECONE_API_KEY=, PINECONE_ENV=
- WEAVIATE_URL=, WEAVIATE_API_KEY=

High-level pipeline components

1. fetch_and_extract.js
   - Downloads or reads dataset files and emits cleaned documents with metadata.
2. chunker.js
   - Splits documents into passages with overlap and yields records {id, text, metadata}.
3. embed_and_index.js
   - Calls embedding API (batched), then upserts vectors into chosen vector DB with metadata.
4. dedupe_store.js
   - Keeps track of seen fingerprints to avoid reindexing duplicates.
5. refresh_scheduler.js
   - Optional: periodic reindex for changing sources.

Starter Node.js commands

```bash
# initialize project (if not already)
npm init -y
# recommended deps (adjust later per provider)
npm install node-fetch dotenv openai @pinecone-database/pinecone
```

Minimal embed_and_index.js sketch (concept)

- Read passages from `chunks.jsonl`
- Batch N passages (e.g., 100)
- Request embeddings
- Upsert to vector DB with metadata {source, url, license, passage_id}

Operational notes

- Respect rate limits and exponential backoff
- Persist progress cursor to resume after failures
- Store original text and passage offsets for provenance
- Keep a separate store for short-lived cached summaries and LLM responses

Next steps I can implement now

- Create `scripts/` starter files: `fetch_and_extract.js`, `chunker.js`, `embed_and_index.js` with minimal runnable scaffolding
- Add `README.md` section showing env vars and quick-start commands
- Wire a simple local FAISS-like fallback using `node-faiss` or store vectors in a JSON file for early testing

If you'd like, I can scaffold the starter scripts next; say "scaffold" and I'll add them.
