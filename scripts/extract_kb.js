const fs = require('fs');
const content = fs.readFileSync('d:/Personality chatbot/server.js', 'utf8');

const lines = content.split('\n');
const kbLines = lines.slice(78, 785).join('\n');

const regex = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?/g;
let match;
const allEntries = [];
const deduped = {};

while ((match = regex.exec(kbLines)) !== null) {
  const key = match[1];
  const value = match[2];
  allEntries.push(key);
  if (!(key in deduped)) {
    deduped[key] = value;
  }
}

const totalEntries = allEntries.length;
const uniqueEntries = Object.keys(deduped).length;
const duplicatesRemoved = totalEntries - uniqueEntries;

const counts = {};
allEntries.forEach((k) => {
  counts[k] = (counts[k] || 0) + 1;
});
const dupKeys = Object.entries(counts).filter(([k, v]) => v > 1);

console.log('Total entries (including duplicates):', totalEntries);
console.log('Unique entries:', uniqueEntries);
console.log('Duplicates removed:', duplicatesRemoved);
console.log('\nDuplicated keys:');
dupKeys.forEach(([k, v]) => console.log('  "' + k + '" appeared ' + v + ' times'));

fs.writeFileSync('d:/Personality chatbot/data/kb.json', JSON.stringify(deduped, null, 2), 'utf8');
console.log('\nWritten to data/kb.json');
