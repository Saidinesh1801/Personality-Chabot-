const { describe, it } = require('node:test');
const assert = require('node:assert');
const { sanitizeMessage, sanitizeString } = require('../src/sanitizer');

describe('sanitizeMessage', () => {
  it('should return a trimmed string', () => {
    assert.strictEqual(sanitizeMessage('  hello world  '), 'hello world');
  });

  it('should collapse multiple spaces', () => {
    assert.strictEqual(sanitizeMessage('hello    world'), 'hello world');
  });

  it('should strip script tags', () => {
    const input = 'hi <script>alert("xss")</script> there';
    const result = sanitizeMessage(input);
    assert.ok(!result.includes('<script>'));
  });

  it('should strip javascript: protocol', () => {
    const result = sanitizeMessage('click javascript:alert(1)');
    assert.ok(!result.toLowerCase().includes('javascript:'));
  });

  it('should return empty string for non-string input', () => {
    assert.strictEqual(sanitizeMessage(123), '');
    assert.strictEqual(sanitizeMessage(null), '');
  });
});

describe('sanitizeString', () => {
  it('should remove control characters', () => {
    const result = sanitizeString('hello\x00world');
    assert.strictEqual(result, 'helloworld');
  });
});
