const SERP_API_KEY = process.env.SERP_API_KEY || null;
const SERP_BASE_URL = 'https://serpapi.com/search';

const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cleanCache() {
  const now = Date.now();
  for (const [key, val] of CACHE.entries()) {
    if (now - val.ts > CACHE_TTL) CACHE.delete(key);
  }
}
setInterval(cleanCache, 60 * 1000);

async function webSearch(query, numResults = 5) {
  if (!query || !query.trim()) return [];

  const q = query.trim();
  const cacheKey = q.toLowerCase();

  if (CACHE.has(cacheKey)) {
    const cached = CACHE.get(cacheKey);
    if (Date.now() - cached.ts < CACHE_TTL) return cached.results;
  }

  if (SERP_API_KEY) {
    return await searchSerpApi(q, numResults, cacheKey);
  }

  return await searchDuckDuckGo(q, numResults, cacheKey);
}

async function searchSerpApi(query, numResults, cacheKey) {
  try {
    const url = `${SERP_BASE_URL}?q=${encodeURIComponent(query)}&num=${numResults}&api_key=${SERP_API_KEY}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error(`SerpAPI ${resp.status}`);
    const data = await resp.json();
    const results = (data.organic_results || []).slice(0, numResults).map(r => ({
      title: r.title || '',
      url: r.link || '',
      snippet: r.snippet || '',
    }));
    CACHE.set(cacheKey, { results, ts: Date.now() });
    return results;
  } catch (err) {
    console.error('[WebSearch] SerpAPI error:', err.message);
    return await searchDuckDuckGo(query, numResults, cacheKey);
  }
}

async function searchDuckDuckGo(query, numResults, cacheKey) {
  try {
    const resp = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&t=chatbot`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!resp.ok) throw new Error(`DuckDuckGo ${resp.status}`);
    const data = await resp.json();
    const results = [];

    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        snippet: data.AbstractText,
      });
    }

    if (data.RelatedTopics && results.length < numResults) {
      for (const topic of data.RelatedTopics.slice(0, numResults)) {
        if (topic.Text && topic.FirstURL) {
          results.push({ title: topic.Text, url: topic.FirstURL, snippet: topic.Text });
        }
      }
    }

    CACHE.set(cacheKey, { results, ts: Date.now() });
    return results;
  } catch (err) {
    console.error('[WebSearch] DuckDuckGo error:', err.message);
    return [];
  }
}

module.exports = { webSearch };
