'use strict';

const assert = require('assert');
const { getPlatformInfo, isTermux, getShell } = require('../src/terminal/platform');

function run() {
  const info = getPlatformInfo();

  assert.ok(info.os, 'Should detect OS name');
  assert.ok(info.platform, 'Should have platform identifier');
  assert.ok(typeof info.isTermux === 'boolean', 'isTermux must be boolean');
  assert.ok(info.nodeVersion.startsWith('v'), 'nodeVersion should start with v');
  assert.ok(info.shell, 'Should detect a shell executable');
  assert.ok(typeof info.supportsColor === 'boolean', 'supportsColor must be boolean');
  assert.ok(info.columns > 0, 'columns should be positive number');
  assert.ok(info.rows > 0, 'rows should be positive number');

  const shell = getShell();
  assert.ok(shell.length > 0, 'getShell should return non-empty string');

  return { name: 'platform.test.js', passed: true };
}

module.exports = { run };
