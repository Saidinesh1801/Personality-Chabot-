const fs = require('fs');
const path = require('path');

function normalize(str) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function loadKB() {
  const kbPath = path.join(__dirname, '..', 'data', 'kb.json');
  const map = new Map();
  try {
    const data = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    for (const [key, value] of Object.entries(data)) {
      map.set(normalize(key), value);
    }
  } catch (err) {
    console.log('Knowledge base not found at', kbPath);
  }
  return map;
}

function findInKB(message, kbMap) {
  const msg = normalize(message);

  const exact = kbMap.get(msg);
  if (exact) return exact;

  const keys = Array.from(kbMap.keys()).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    if (msg.includes(key) && key.length > 3) {
      return kbMap.get(key);
    }
  }

  const patterns = [/^what is\s+(.+)$/, /^who is\s+(.+)$/, /^who's\s+(.+)$/];
  for (const pat of patterns) {
    const m = msg.match(pat);
    if (m) {
      const topic = normalize(m[1]);
      const directKey = msg;
      if (kbMap.has(directKey)) return kbMap.get(directKey);
      for (const key of keys) {
        if (key.includes(topic) && topic.length > 2) {
          return kbMap.get(key);
        }
      }
    }
  }

  return null;
}

module.exports = { loadKB, normalize, findInKB };
