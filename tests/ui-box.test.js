'use strict';

const assert = require('assert');
const { createBox, stripAnsi } = require('../src/cli/box');
const { renderSummaryCard } = require('../src/cli/summary-card');

function run() {
  // 1. Box rendering
  const box = createBox(['Line 1 content', 'Second line of text'], {
    title: 'TEST BOX',
    borderColor: 'green'
  });

  const plain = stripAnsi(box);
  assert.ok(plain.includes('TEST BOX'));
  assert.ok(plain.includes('Line 1 content'));
  assert.ok(plain.includes('Second line of text'));
  assert.ok(plain.includes('╭'));
  assert.ok(plain.includes('╯'));

  // 2. Summary Card
  const summaryCard = renderSummaryCard({
    status: 'SUCCESS',
    iterations: 4,
    verified: true,
    modifiedFiles: ['src/app.js', 'src/util.js']
  }, {
    durationMs: 3200,
    maxIterations: 25,
    usageStats: { promptTokens: 1200, completionTokens: 300, totalTokens: 1500 }
  });

  const plainSummary = stripAnsi(summaryCard);
  assert.ok(plainSummary.includes('EXECUTION SUMMARY'));
  assert.ok(plainSummary.includes('SUCCESS'));
  assert.ok(plainSummary.includes('Verified'));
  assert.ok(plainSummary.includes('src/app.js'));
  assert.ok(plainSummary.includes('Tokens:'));
  assert.ok(plainSummary.includes('total'));

  return { name: 'ui-box.test.js', passed: true };
}

module.exports = { run };
