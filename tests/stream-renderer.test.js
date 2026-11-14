'use strict';

const assert = require('assert');
const StreamRenderer = require('../src/cli/stream-renderer');

module.exports = { run: async function streamTest() {
  // Test 1: Basic streaming
  const chunks = [];
  const origWrite = process.stdout.write;
  process.stdout.write = (data) => { chunks.push(data); return true; };

  try {
    const renderer = new StreamRenderer({ linePrefix: '> ' });
    renderer.start();
    assert.strictEqual(renderer.isStreaming, true);
    renderer.onToken('Hello');
    renderer.onToken(' world');
    renderer.end();
    assert.strictEqual(renderer.isStreaming, false);

    assert.ok(chunks.includes('> '), 'Should write prefix on start');
    assert.ok(chunks.includes('Hello'), 'Should write first token');
    assert.ok(chunks.includes(' world'), 'Should write second token');
    assert.ok(chunks.includes('\n'), 'Should write newline on end');
  } finally {
    process.stdout.write = origWrite;
  }

  // Test 2: Quiet mode
  const quietChunks = [];
  process.stdout.write = (data) => { quietChunks.push(data); return true; };

  try {
    const quiet = new StreamRenderer({ quiet: true });
    quiet.start();
    quiet.onToken('test');
    quiet.end();
    assert.strictEqual(quietChunks.length, 0, 'Quiet mode should produce no output');
  } finally {
    process.stdout.write = origWrite;
  }

  // Test 3: Newline handling
  const nlChunks = [];
  process.stdout.write = (data) => { nlChunks.push(data); return true; };

  try {
    const renderer = new StreamRenderer({ linePrefix: '| ' });
    renderer.start();
    renderer.onToken('line1\nline2');
    renderer.end();

    const output = nlChunks.join('');
    assert.ok(output.includes('line1'), 'Should contain first line');
    assert.ok(output.includes('line2'), 'Should contain second line');
  } finally {
    process.stdout.write = origWrite;
  }
} };
