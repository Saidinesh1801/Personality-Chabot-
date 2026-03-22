const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildMemoryPrompt, getMemorySummary } = require('../src/memory');

describe('getMemorySummary', () => {
  it('should return null for unknown key', () => {
    const result = getMemorySummary('nonexistent_user', []);
    assert.strictEqual(result, null);
  });
});

describe('buildMemoryPrompt', () => {
  it('should return empty string when no summary', () => {
    const prompt = buildMemoryPrompt('user123', []);
    assert.strictEqual(prompt, '');
  });

  it('should return empty string for null messages', () => {
    const prompt = buildMemoryPrompt('user123', null);
    assert.strictEqual(prompt, '');
  });
});
