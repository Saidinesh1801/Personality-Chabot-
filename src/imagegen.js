const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'dall-e-3';
const IMAGE_SIZE = process.env.IMAGE_SIZE || '1024x1024';
const IMAGE_QUALITY = process.env.IMAGE_QUALITY || 'standard';

const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY || null;
const LEONARDO_MODEL = process.env.LEONARDO_MODEL || 'stable-diffusion-xl-1024-v2-0';

const CACHE = new Map();
const MAX_CACHE_SIZE = 50;

function addToCache(key, value) {
  if (CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = CACHE.keys().next().value;
    CACHE.delete(firstKey);
  }
  CACHE.set(key, { value, ts: Date.now() });
}

function getFromCache(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > 30 * 60 * 1000) {
    CACHE.delete(key);
    return null;
  }
  return entry.value;
}

async function generateImageDalle(prompt) {
  if (!OPENAI_API_KEY) return null;
  try {
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: IMAGE_SIZE,
        quality: IMAGE_QUALITY,
        response_format: 'b64_json',
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error('[ImageGen] DALL-E error:', err.slice(0, 200));
      return null;
    }
    const data = await resp.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (b64) return `data:image/png;base64,${b64}`;

    const url = data?.data?.[0]?.url;
    if (url) return url;

    return null;
  } catch (err) {
    console.error('[ImageGen] DALL-E error:', err.message);
    return null;
  }
}

async function generateImageLeonardo(prompt) {
  if (!LEONARDO_API_KEY) return null;
  try {
    const resp = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LEONARDO_API_KEY}`,
      },
      body: JSON.stringify({
        modelId: LEONARDO_MODEL,
        prompt,
        width: 1024,
        height: 1024,
        num_images: 1,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const genId = data?.generations?.[0]?.id;
    if (!genId) return null;

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const statusResp = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${genId}`, {
        headers: { Authorization: `Bearer ${LEONARDO_API_KEY}` },
      });
      const statusData = await statusResp.json();
      const status = statusData?.generations_by_id?.[0]?.status;
      if (status === 'COMPLETE') {
        const imgUrl = statusData.generations_by_id[0].generated_images?.[0]?.url;
        return imgUrl || null;
      }
      if (status === 'FAILED') return null;
    }
    return null;
  } catch (err) {
    console.error('[ImageGen] Leonardo error:', err.message);
    return null;
  }
}

async function generateImage(prompt, style = 'vivid') {
  if (!prompt || !prompt.trim()) return null;
  const cleanPrompt = prompt.trim();
  const cacheKey = `${style}_${cleanPrompt}`;

  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  let imageData = null;

  if (OPENAI_API_KEY) {
    const dallePrompt =
      style === 'natural'
        ? `${cleanPrompt}, photorealistic, high quality`
        : `${cleanPrompt}, digital art, vibrant colors, detailed illustration`;
    imageData = await generateImageDalle(dallePrompt);
  }

  if (!imageData && LEONARDO_API_KEY) {
    imageData = await generateImageLeonardo(cleanPrompt);
  }

  if (imageData) {
    addToCache(cacheKey, imageData);
  }

  return imageData;
}

function detectImageRequest(text) {
  const imageKeywords = [
    'generate an image',
    'generate image',
    'create an image',
    'create image',
    'draw',
    'paint',
    'show me a picture',
    'can you draw',
    'make an image',
    'generate a picture',
    'generate a photo',
    'create a picture',
    'image of',
    'picture of',
    'photo of',
    'illustration of',
    'visual of',
    'render',
    'visualize',
  ];
  const lower = text.toLowerCase();
  return imageKeywords.some((kw) => lower.includes(kw));
}

module.exports = { generateImage, detectImageRequest, generateImageDalle, generateImageLeonardo };
