const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateChatRequest } = require('../src/validation');

describe('validateChatRequest', () => {
  it('should accept a valid request with defaults', () => {
    const result = validateChatRequest({ message: 'Hello there' });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.message, 'Hello there');
    assert.strictEqual(result.personality, 'Friendly');
    assert.strictEqual(result.mode, 'default');
  });

  it('should reject when message is missing', () => {
    const result = validateChatRequest({});
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('Message is required'));
  });

  it('should reject an empty string message', () => {
    const result = validateChatRequest({ message: '   ' });
    assert.strictEqual(result.valid, false);
  });

  it('should reject a message longer than 2000 characters', () => {
    const result = validateChatRequest({ message: 'a'.repeat(2001) });
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('2000'));
  });

  it('should reject an invalid personality', () => {
    const result = validateChatRequest({ message: 'hi', personality: 'Villain' });
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('Personality must be one of'));
  });

  it('should accept a valid personality', () => {
    const result = validateChatRequest({ message: 'hi', personality: 'Sarcastic' });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.personality, 'Sarcastic');
  });
});
