'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Orchestrator = require('../src/core/orchestrator');

async function run() {
  const dummyWorkspace = path.join(os.tmpdir(), 'fixen-resume-test-' + Date.now());
  fs.mkdirSync(dummyWorkspace, { recursive: true });

  try {
    const orchestrator = new Orchestrator({
      workspace: dummyWorkspace,
      permissionLevel: 5
    });

    // Mock provider on orchestrator
    orchestrator.provider = {
      chat: async ({ messages }) => {
        // When resumed, provider inspects and claims completion
        return {
          content: 'I have verified math.js and confirmed all operations work properly.',
          toolCalls: null
        };
      }
    };

    // Pre-create a file that was modified before crash
    fs.writeFileSync(path.join(dummyWorkspace, 'math.js'), 'module.exports = { add: (a,b) => a+b };', 'utf8');

    // Simulate an interrupted session checkpoint
    const sessionId = 'sess_interrupted_999';
    orchestrator.checkpointManager.saveCheckpoint(sessionId, {
      task: 'Build math utility',
      status: 'INTERRUPTED',
      currentIteration: 2,
      maxIterations: 10,
      modifiedFiles: ['math.js'],
      plan: {
        objective: 'Build math utility',
        steps: [
          { id: 1, action: 'write', description: 'Create math.js', files: ['math.js'] },
          { id: 2, action: 'verify', description: 'Verify math.js', files: ['math.js'] }
        ]
      }
    });

    // Verify checkpoint exists and is interrupted
    const interruptedBefore = orchestrator.checkpointManager.getLatestInterruptedSession();
    assert.ok(interruptedBefore !== null);
    assert.strictEqual(interruptedBefore.sessionId, sessionId);

    // Call resumeTask
    const result = await orchestrator.resumeTask(sessionId);

    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.summary.includes('verified math.js'));

    // Verify checkpoint is now marked COMPLETED
    const checkpointAfter = orchestrator.checkpointManager.getCheckpoint(sessionId);
    assert.strictEqual(checkpointAfter.status, 'COMPLETED');

    const interruptedAfter = orchestrator.checkpointManager.getLatestInterruptedSession();
    assert.strictEqual(interruptedAfter, null, 'No interrupted sessions should remain');

    return { name: 'resume.test.js', passed: true };
  } finally {
    try {
      fs.rmSync(dummyWorkspace, { recursive: true, force: true });
    } catch {}
  }
}

module.exports = { run };
