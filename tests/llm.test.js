const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildGroqMessages } = require('../src/llm');

describe('buildGroqMessages', () => {
  it('keeps the current question and recent history within the provider prompt budget', () => {
    const history = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      text: `history-${index} ${'x'.repeat(3000)}`,
    }));

    const messages = buildGroqMessages('system prompt', 'current question', history);
    const combined = messages.map(message => message.content).join('');

    assert.ok(combined.length <= 12000);
    assert.strictEqual(messages[0].role, 'system');
    assert.strictEqual(messages[messages.length - 1].content, 'current question');
    assert.ok(combined.includes('history-9'));
    assert.ok(!combined.includes('history-0'));
  });

  it('shortens an oversized current prompt without dropping its beginning or end', () => {
    const oversized = `Question: ${'x'.repeat(15000)} answer briefly`;
    const messages = buildGroqMessages('system prompt', oversized);
    const userMessage = messages[messages.length - 1].content;

    assert.ok(userMessage.length < oversized.length);
    assert.ok(userMessage.startsWith('Question:'));
    assert.ok(userMessage.endsWith('answer briefly'));
  });
});
