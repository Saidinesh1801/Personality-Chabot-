const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cosineSimilarity, getMockEmbedding } = require('../src/rag');

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const vec = [1, 2, 3];
    const sim = cosineSimilarity(vec, vec);
    assert.ok(Math.abs(sim - 1) < 1e-9);
  });

  it('should return 0 for orthogonal vectors', () => {
    const sim = cosineSimilarity([1, 0], [0, 1]);
    assert.ok(Math.abs(sim) < 1e-9);
  });

  it('should return 0 for empty vectors', () => {
    assert.strictEqual(cosineSimilarity([], []), 0);
    assert.strictEqual(cosineSimilarity(null, null), 0);
  });

  it('should handle opposite vectors', () => {
    const sim = cosineSimilarity([1, 0], [-1, 0]);
    assert.ok(Math.abs(sim - -1) < 1e-9);
  });
});

describe('getMockEmbedding', () => {
  it('should return an array of 768 numbers', () => {
    const emb = getMockEmbedding('test input');
    assert.strictEqual(emb.length, 768);
    assert.ok(emb.every((v) => typeof v === 'number'));
  });

  it('should return deterministic results for the same input', () => {
    const a = getMockEmbedding('hello world');
    const b = getMockEmbedding('hello world');
    assert.deepStrictEqual(a, b);
  });

  it('should return different embeddings for different inputs', () => {
    const a = getMockEmbedding('coffee');
    const b = getMockEmbedding('music');
    const same = a.every((v, i) => v === b[i]);
    assert.strictEqual(same, false);
  });
});
