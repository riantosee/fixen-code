'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const CheckpointManager = require('../src/memory/checkpoint-manager');

function run() {
  const dummyWorkspace = path.join(os.tmpdir(), 'fixen-chk-test-' + Date.now());
  fs.mkdirSync(dummyWorkspace, { recursive: true });

  try {
    const cm = new CheckpointManager(dummyWorkspace);

    // 1. Save checkpoint
    const cp = cm.saveCheckpoint('sess_test_123', {
      task: 'Build authentication',
      status: 'RUNNING',
      currentIteration: 3,
      maxIterations: 20,
      modifiedFiles: ['src/auth.js'],
      plan: { objective: 'Build auth', steps: [{ id: 1, action: 'create', description: 'auth.js' }] }
    });

    assert.strictEqual(cp.sessionId, 'sess_test_123');
    assert.strictEqual(cp.status, 'RUNNING');
    assert.strictEqual(cp.currentIteration, 3);

    // 2. Mark interrupted
    const interrupted = cm.markInterrupted('sess_test_123', 'Network disconnected');
    assert.strictEqual(interrupted.status, 'INTERRUPTED');
    assert.strictEqual(interrupted.interruptionReason, 'Network disconnected');

    // 3. Get latest interrupted session
    const latest = cm.getLatestInterruptedSession();
    assert.ok(latest !== null);
    assert.strictEqual(latest.sessionId, 'sess_test_123');

    // 4. Mark completed
    cm.markCompleted('sess_test_123');
    const completed = cm.getCheckpoint('sess_test_123');
    assert.strictEqual(completed.status, 'COMPLETED');

    const noActive = cm.getLatestInterruptedSession();
    assert.strictEqual(noActive, null, 'No interrupted session should remain once completed');

    return { name: 'checkpoint.test.js', passed: true };
  } finally {
    try {
      fs.rmSync(dummyWorkspace, { recursive: true, force: true });
    } catch {}
  }
}

module.exports = { run };
