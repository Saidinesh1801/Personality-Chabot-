const { describe, it } = require('node:test');
const assert = require('node:assert');
const { normalize, findInKB, loadKB } = require('../src/kb');

describe('normalize', () => {
  it('should lowercase and trim', () => {
    assert.strictEqual(normalize('  Hello World  '), 'hello world');
  });

  it('should collapse whitespace', () => {
    assert.strictEqual(normalize('a   b   c'), 'a b c');
  });

  it('should handle null/undefined', () => {
    assert.strictEqual(normalize(null), '');
    assert.strictEqual(normalize(undefined), '');
  });
});

describe('findInKB', () => {
  it('should return exact match from map', () => {
    const map = new Map([['hello', 'greeting response']]);
    assert.strictEqual(findInKB('hello', map), 'greeting response');
  });

  it('should return substring match when key length > 3', () => {
    const map = new Map([['coffee', 'coffee info']]);
    assert.strictEqual(findInKB('I love coffee so much', map), 'coffee info');
  });

  it('should return null when no match', () => {
    const map = new Map([['coffee', 'info']]);
    assert.strictEqual(findInKB('tell me about tea', map), null);
  });
});

describe('loadKB', () => {
  it('should return a Map', () => {
    const map = loadKB();
    assert.ok(map instanceof Map);
  });
});
