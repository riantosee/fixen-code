'use strict';

const assert = require('assert');
const AnthropicProvider = require('../src/providers/anthropic-provider');

module.exports = {
  run: async function anthropicProviderTest() {
    const provider = new AnthropicProvider({ apiKey: 'test-anthropic-key' });

    // Test 1: Tool format conversion
    const openAITools = [
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read file contents',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string' }
            },
            required: ['path']
          }
        }
      }
    ];

    const anthropicTools = provider._formatTools(openAITools);
    assert.strictEqual(anthropicTools.length, 1);
    assert.strictEqual(anthropicTools[0].name, 'read_file');
    assert.strictEqual(anthropicTools[0].description, 'Read file contents');
    assert.deepStrictEqual(anthropicTools[0].input_schema, openAITools[0].function.parameters);

    // Test 2: Message format conversion
    const openAIMessages = [
      { role: 'system', content: 'You are FIXEN CODE.' },
      { role: 'user', content: 'Inspect the code' },
      {
        role: 'assistant',
        content: 'I will read the file',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'read_file',
              arguments: JSON.stringify({ path: 'index.js' })
            }
          }
        ]
      },
      {
        role: 'tool',
        tool_call_id: 'call_1',
        content: 'file contents here'
      }
    ];

    const { system, messages } = provider._formatMessages(openAIMessages);
    assert.strictEqual(system, 'You are FIXEN CODE.');
    assert.strictEqual(messages.length, 3);
    assert.strictEqual(messages[0].role, 'user');
    assert.strictEqual(messages[1].role, 'assistant');
    assert.strictEqual(messages[1].content[0].text, 'I will read the file');
    assert.strictEqual(messages[1].content[1].type, 'tool_use');
    assert.strictEqual(messages[1].content[1].name, 'read_file');
    assert.strictEqual(messages[2].role, 'user');
    assert.strictEqual(messages[2].content[0].type, 'tool_result');
    assert.strictEqual(messages[2].content[0].tool_use_id, 'call_1');

    // Test 3: Missing API key handling
    const noKeyProvider = new AnthropicProvider({ apiKey: '' });
    const conn = await noKeyProvider.testConnection();
    assert.strictEqual(conn.success, false);
    assert.ok(conn.error.includes('ANTHROPIC_API_KEY'));
  }
};
