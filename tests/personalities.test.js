const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getPersonalities, getPersonalityPrompt, getToneForSituation } = require('../src/personalities');

describe('getPersonalities', () => {
  it('should return an array of personality names', () => {
    const result = getPersonalities();
    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
  });

  it('should include Friendly', () => {
    assert.ok(getPersonalities().includes('Friendly'));
  });

  it('should include all five personalities', () => {
    const expected = ['Friendly', 'Formal', 'Sarcastic', 'Enthusiastic', 'Wise'];
    const result = getPersonalities();
    for (const p of expected) {
      assert.ok(result.includes(p), `Missing personality: ${p}`);
    }
  });
});

describe('getPersonalityPrompt', () => {
  it('should return a string prompt for a valid personality', () => {
    const prompt = getPersonalityPrompt('Friendly');
    assert.strictEqual(typeof prompt, 'string');
    assert.ok(prompt.length > 0);
  });

  it('should fall back to Friendly for unknown personality', () => {
    const fallback = getPersonalityPrompt('Unknown');
    const friendly = getPersonalityPrompt('Friendly');
    assert.strictEqual(fallback, friendly);
  });
});

describe('getToneForSituation', () => {
  it('should return Friendly for default situation', () => {
    assert.strictEqual(getToneForSituation('default'), 'Friendly');
  });

  it('should fall back to Friendly for unknown situation', () => {
    assert.strictEqual(getToneForSituation('nonexistent'), 'Friendly');
  });
});
