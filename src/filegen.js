/**
 * @file File generation module - create files from AI output
 * @module src/filegen
 */

const fs = require('fs');
const path = require('path');

function extractCodeBlocks(text) {
  const blocks = [];

  // Markdown code blocks
  const mdMatches = text.match(/```(\w*)\n([\s\S]*?)```/g) || [];
  mdMatches.forEach((match) => {
    const langMatch = match.match(/```(\w*)\n/);
    const codeMatch = match.match(/```(?:\w*)\n([\s\S]*?)```/);
    if (codeMatch) {
      blocks.push({
        language: langMatch ? langMatch[1] : 'txt',
        code: codeMatch[1].trim(),
      });
    }
  });

  // Inline code (single backticks) - skip for now

  return blocks;
}

function detectFilename(code, language) {
  const extMap = {
    js: 'script.js',
    javascript: 'script.js',
    py: 'script.py',
    python: 'script.py',
    html: 'index.html',
    css: 'style.css',
    json: 'data.json',
    txt: 'output.txt',
    md: 'README.md',
    ts: 'script.ts',
    typescript: 'script.ts',
    sh: 'script.sh',
    bash: 'script.sh',
    sql: 'query.sql',
    xml: 'data.xml',
    yaml: 'config.yaml',
    yml: 'config.yml',
  };

  return extMap[language] || 'output.txt';
}

function generateFile(code, language, outputDir = 'generated') {
  const dir = path.join(process.cwd(), outputDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = detectFilename(code, language);
  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, code, 'utf8');

  return { filepath, filename };
}

module.exports = { extractCodeBlocks, detectFilename, generateFile };
