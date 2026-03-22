#!/usr/bin/env node

/**
 * fetch_and_extract.js
 * 
 * Downloads or reads dataset files and emits cleaned documents with metadata.
 * Output: JSONL file with {id, text, metadata: {source, url, license, etc.}}
 */

const fs = require('fs');
const path = require('path');

/**
 * Example: fetch and parse a small Wikipedia-like dataset
 * In production, this would download dumps and parse them.
 */
async function fetchWikipedia() {
  console.log('📥 Fetching Wikipedia dataset (stub)...');
  // Placeholder: in real scenario, download .xml.bz2, decompress, parse
  const docs = [
    {
      id: 'wiki_1',
      text: 'Albert Einstein was a German-born theoretical physicist...',
      metadata: {
        source: 'Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Albert_Einstein',
        license: 'CC-BY-SA-3.0',
        extracted_at: new Date().toISOString(),
      },
    },
    {
      id: 'wiki_2',
      text: 'The Python programming language is known for readability...',
      metadata: {
        source: 'Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Python_(programming_language)',
        license: 'CC-BY-SA-3.0',
        extracted_at: new Date().toISOString(),
      },
    },
  ];
  return docs;
}

/**
 * Example: fetch books from OpenLibrary bulk export
 * In production, download the JSONL dump and parse.
 */
async function fetchBooks() {
  console.log('📚 Fetching Books dataset (stub)...');
  // Placeholder: download OpenLibrary JSONL dump
  const docs = [
    {
      id: 'book_1',
      text: 'The Great Gatsby by F. Scott Fitzgerald is a novel set in the Jazz Age...',
      metadata: {
        source: 'OpenLibrary',
        url: 'https://openlibrary.org/books/OL123456M',
        license: 'Public Domain (varies)',
        extracted_at: new Date().toISOString(),
      },
    },
  ];
  return docs;
}

/**
 * Example: fetch Q&A from StackExchange
 * In production, download the XML dump and parse questions+answers.
 */
async function fetchStackExchange() {
  console.log('❓ Fetching StackExchange dataset (stub)...');
  // Placeholder: download Stack Overflow XML dump
  const docs = [
    {
      id: 'stack_1',
      text: 'Q: How do I sort a list in Python? A: Use the sorted() function or the .sort() method...',
      metadata: {
        source: 'StackOverflow',
        url: 'https://stackoverflow.com/questions/12345678',
        license: 'CC-BY-SA-4.0',
        extracted_at: new Date().toISOString(),
      },
    },
  ];
  return docs;
}

/**
 * Main: collect all datasets and write to JSONL
 */
async function main() {
  const outputPath = path.join(__dirname, '..', 'data', 'documents.jsonl');
  
  // Ensure data directory exists
  const dataDir = path.dirname(outputPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const allDocs = [];
  
  try {
    allDocs.push(...await fetchWikipedia());
    allDocs.push(...await fetchBooks());
    allDocs.push(...await fetchStackExchange());
    
    // Write JSONL
    const stream = fs.createWriteStream(outputPath);
    for (const doc of allDocs) {
      stream.write(JSON.stringify(doc) + '\n');
    }
    stream.end();

    console.log(`✅ Extracted ${allDocs.length} documents to ${outputPath}`);
  } catch (err) {
    console.error('❌ Error fetching/extracting:', err.message);
    process.exit(1);
  }
}

main();
