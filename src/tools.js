/**
 * @file Tool calling functions for AI capabilities
 * @module src/tools
 */

const { webSearch } = require('./websearch');

async function callTool(message, options = {}) {
  const lower = message.toLowerCase().trim();

  // Time
  if (lower === 'what is the time now' || lower === 'current time' || lower === 'what time is it') {
    return new Date().toLocaleTimeString();
  }

  // Date
  if (lower === 'what is the date' || lower === 'current date' || lower === 'what date is it') {
    return new Date().toLocaleDateString();
  }

  // Calculator - simple math expressions
  if (
    lower.includes('calculate') ||
    lower.includes('compute') ||
    /^\d+[\s+\-*/%()\d]+=/.test(lower)
  ) {
    const expr = lower
      .replace(/^(calculate|compute)\s*/i, '')
      .replace(/=/, '')
      .trim();
    try {
      const result = Function('"use strict"; return (' + expr + ')')();
      return `Result: ${result}`;
    } catch (e) {
      return 'Could not calculate that expression';
    }
  }

  // Web search
  if (lower.startsWith('search ') || lower.startsWith('find ') || lower.startsWith('look up ')) {
    const query = lower.replace(/^(search|find|look up)\s*/i, '');
    const results = await webSearch(query, 3);
    if (results.length > 0) {
      return results.map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}`).join('\n\n');
    }
    return 'No results found';
  }

  // Weather (basic - just return a placeholder)
  if (lower.includes('weather')) {
    return "I'm not connected to a live weather service. You can check your local weather app or weather website.";
  }

  return null;
}

module.exports = { callTool };
