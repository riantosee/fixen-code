'use strict';

const assert = require('assert');
const GroqProvider = require('../src/providers/groq-provider');

async function run() {
  const provider = new GroqProvider({
    apiKey: 'gsk_mock_test_key_123456789012345',
    defaultModel: 'llama-3.3-70b-versatile'
  });

  assert.strictEqual(provider.name, 'groq');
  assert.strictEqual(provider.model, 'llama-3.3-70b-versatile');

  // Model switch
  provider.setModel('llama-3.1-8b-instant');
  assert.strictEqual(provider.model, 'llama-3.1-8b-instant');

  // Token recording
  provider.recordUsage({
    prompt_tokens: 150,
    completion_tokens: 50,
    total_tokens: 200
  });

  const stats = provider.getUsageStats();
  assert.strictEqual(stats.calls, 1);
  assert.strictEqual(stats.promptTokens, 150);
  assert.strictEqual(stats.completionTokens, 50);
  assert.strictEqual(stats.totalTokens, 200);

  // Missing API key test
  const emptyProvider = new GroqProvider({ apiKey: '' });
  emptyProvider.apiKey = '';
  const testRes = await emptyProvider.testConnection();
  assert.strictEqual(testRes.success, false);
  assert.ok(testRes.error.includes('GROQ_API_KEY'));

  return { name: 'groq-provider.test.js', passed: true };
}

module.exports = { run };
