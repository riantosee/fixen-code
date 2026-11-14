'use strict';

const assert = require('assert');

// Test SSE parsing by mocking the fetch response
module.exports = { run: async function streamingProviderTest() {
  const GroqProvider = require('../src/providers/groq-provider');

  // Test 1: _parseSSEStream correctly accumulates tokens
  const provider = new GroqProvider({ apiKey: 'test-key' });

  // Create a mock ReadableStream
  const sseData = [
    'data: {"choices":[{"delta":{"content":"Hello"},"index":0}]}\n\n',
    'data: {"choices":[{"delta":{"content":" World"},"index":0}]}\n\n',
    'data: {"choices":[{"delta":{},"index":0,"finish_reason":"stop"}]}\n\n',
    'data: [DONE]\n\n'
  ];

  const chunks = sseData.map(s => new TextEncoder().encode(s));
  let chunkIndex = 0;

  const mockReader = {
    read() {
      if (chunkIndex < chunks.length) {
        return Promise.resolve({ done: false, value: chunks[chunkIndex++] });
      }
      return Promise.resolve({ done: true, value: undefined });
    },
    releaseLock() {}
  };

  const mockResponse = {
    body: {
      getReader() { return mockReader; }
    }
  };

  const tokens = [];
  const result = await provider._parseSSEStream(mockResponse, (token) => {
    tokens.push(token);
  });

  assert.strictEqual(result.content, 'Hello World', 'Should accumulate full content');
  assert.deepStrictEqual(tokens, ['Hello', ' World'], 'Should emit each token separately');
  assert.strictEqual(result.finishReason, 'stop', 'Should capture finish reason');
  assert.strictEqual(result.toolCalls, null, 'No tool calls expected');

  // Test 2: Tool call streaming
  const toolSSE = [
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_123","function":{"name":"read_","arguments":""}}]},"index":0}]}\n\n',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"file","arguments":"{\\"path\\""}}]},"index":0}]}\n\n',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":\\"test.js\\"}"}}]},"index":0}]}\n\n',
    'data: {"choices":[{"delta":{},"index":0,"finish_reason":"tool_calls"}]}\n\n',
    'data: [DONE]\n\n'
  ];

  const toolChunks = toolSSE.map(s => new TextEncoder().encode(s));
  let toolIdx = 0;

  const toolReader = {
    read() {
      if (toolIdx < toolChunks.length) {
        return Promise.resolve({ done: false, value: toolChunks[toolIdx++] });
      }
      return Promise.resolve({ done: true, value: undefined });
    },
    releaseLock() {}
  };

  const toolResponse = { body: { getReader() { return toolReader; } } };
  const toolResult = await provider._parseSSEStream(toolResponse, () => {});

  assert.ok(toolResult.toolCalls, 'Should have tool calls');
  assert.strictEqual(toolResult.toolCalls.length, 1, 'Should have one tool call');
  assert.strictEqual(toolResult.toolCalls[0].id, 'call_123', 'Tool call ID should match');
  assert.strictEqual(toolResult.toolCalls[0].function.name, 'read_file', 'Tool name should accumulate');
  assert.strictEqual(toolResult.finishReason, 'tool_calls', 'Finish reason should be tool_calls');

  // Test 3: BaseProvider chatStream fallback
  const BaseProvider = require('../src/providers/base-provider');

  class TestProvider extends BaseProvider {
    async chat() {
      return { content: 'fallback response', toolCalls: null, finishReason: 'stop', usage: null, raw: {} };
    }
  }

  const testProvider = new TestProvider('test', {});
  const fallbackTokens = [];
  const fallbackResult = await testProvider.chatStream({
    messages: [{ role: 'user', content: 'hi' }],
    onToken: (t) => fallbackTokens.push(t)
  });

  assert.strictEqual(fallbackResult.content, 'fallback response', 'Fallback should return chat result');
  assert.deepStrictEqual(fallbackTokens, ['fallback response'], 'Fallback should emit full content as single token');
} };
