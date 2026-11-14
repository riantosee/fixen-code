'use strict';

const assert = require('assert');
const TerminalExecutor = require('../src/terminal/executor');

async function run() {
  const executor = new TerminalExecutor({ timeoutMs: 5000 });

  // 1. Basic execution
  const res = await executor.execute('node -e "console.log(\'FIXEN_TEST_OUTPUT\')"');
  assert.strictEqual(res.exitCode, 0);
  assert.ok(res.stdout.includes('FIXEN_TEST_OUTPUT'));
  assert.strictEqual(res.timedOut, false);

  // 2. Error execution
  const failRes = await executor.execute('node -e "process.exit(42)"');
  assert.strictEqual(failRes.exitCode, 42);

  // 3. Dangerous pattern check
  assert.strictEqual(executor.isDangerous('rm -rf /'), true);
  assert.strictEqual(executor.isDangerous('rmdir /s /q C:\\'), true);
  assert.strictEqual(executor.isDangerous('dd if=/dev/zero of=/dev/sda'), true);
  assert.strictEqual(executor.isDangerous('git status'), false);
  assert.strictEqual(executor.isDangerous('npm test'), false);

  // 4. Timeout handling
  const shortTimeoutExecutor = new TerminalExecutor({ timeoutMs: 500 });
  const timeoutRes = await shortTimeoutExecutor.execute('node -e "setTimeout(() => {}, 2000)"');
  assert.strictEqual(timeoutRes.timedOut, true);

  return { name: 'terminal-tools.test.js', passed: true };
}

module.exports = { run };
