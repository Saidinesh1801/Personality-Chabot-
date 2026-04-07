const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  checkSafety,
  readabilityGrade,
  enhanceMusicResponse,
  applyHumorGuardrail,
} = require('../src/safety');

describe('checkSafety', () => {
  it('should return null for a safe message', () => {
    const result = checkSafety('Tell me about coffee');
    assert.strictEqual(result, null);
  });

  it('should return null for previously-sensitive content (after fix)', () => {
    const result = checkSafety('tell me about violence');
    assert.strictEqual(result, null);
  });

  it('should return null regardless of casing (after fix)', () => {
    const result = checkSafety('KILL something');
    assert.strictEqual(result, null);
  });
});

describe('readabilityGrade', () => {
  it('should return a number', () => {
    const grade = readabilityGrade('The quick brown fox jumps over the lazy dog.');
    assert.strictEqual(typeof grade, 'number');
  });

  it('should return 0 for empty input', () => {
    assert.strictEqual(readabilityGrade(''), 0);
    assert.strictEqual(readabilityGrade(null), 0);
  });
});

describe('enhanceMusicResponse', () => {
  it('should add music notes when user asks for music recommendations', () => {
    const reply = enhanceMusicResponse('Can you recommend some music?', 'Sure!');
    assert.ok(reply.includes('Mood tags'));
    assert.ok(reply.includes('Licensing'));
  });

  it('should return reply unchanged for non-music messages', () => {
    const reply = enhanceMusicResponse('Tell me a joke', 'Ha ha!');
    assert.strictEqual(reply, 'Ha ha!');
  });
});

describe('applyHumorGuardrail', () => {
  it('should pass through clean responses', () => {
    const result = applyHumorGuardrail('This is a nice response.');
    assert.strictEqual(result, 'This is a nice response.');
  });
});
