'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Orchestrator = require('../src/core/orchestrator');

async function run() {
  const dummyWorkspace = path.join(os.tmpdir(), 'fixen-integration-' + Date.now());
  fs.mkdirSync(dummyWorkspace, { recursive: true });

  try {
    const orchestrator = new Orchestrator({
      workspace: dummyWorkspace,
      permissionLevel: 5 // Full auto for deterministic test
    });

    // 1. Tool execution via Orchestrator registry
    const writeRes = await orchestrator.toolRegistry.execute('write_file', {
      path: 'index.js',
      content: 'module.exports = function greet(name) { return "Hello " + name; };\n'
    });
    assert.strictEqual(writeRes.success, true);
    assert.ok(fs.existsSync(path.join(dummyWorkspace, 'index.js')));

    // 2. Terminal execution via Orchestrator registry
    const execRes = await orchestrator.toolRegistry.execute('execute_command', {
      command: 'node -e "const g = require(\'./index.js\'); if (g(\'FIXEN\') !== \'Hello FIXEN\') process.exit(1); console.log(\'TEST_PASSED\');"',
      cwd: dummyWorkspace
    });

    assert.strictEqual(execRes.success, true);
    assert.strictEqual(execRes.result.exitCode, 0);
    assert.ok(execRes.result.stdout.includes('TEST_PASSED'));

    // 3. Edit file
    const editRes = await orchestrator.toolRegistry.execute('edit_file', {
      path: 'index.js',
      target: 'return "Hello " + name;',
      replacement: 'return "Hi, " + name;'
    });
    assert.strictEqual(editRes.success, true);

    // 4. Verify edited behavior
    const execRes2 = await orchestrator.toolRegistry.execute('execute_command', {
      command: 'node -e "const g = require(\'./index.js\'); if (g(\'FIXEN\') !== \'Hi, FIXEN\') process.exit(1); console.log(\'EDIT_VERIFIED\');"',
      cwd: dummyWorkspace
    });
    assert.strictEqual(execRes2.success, true);
    assert.strictEqual(execRes2.result.exitCode, 0);
    assert.ok(execRes2.result.stdout.includes('EDIT_VERIFIED'));

    return { name: 'integration.test.js', passed: true };
  } finally {
    try {
      fs.rmSync(dummyWorkspace, { recursive: true, force: true });
    } catch {}
  }
}

module.exports = { run };
