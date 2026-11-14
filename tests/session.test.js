'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const SessionStore = require('../src/memory/session-store');

function run() {
  const dummyWorkspace = path.join(os.tmpdir(), 'fixen-session-test-' + Date.now());
  fs.mkdirSync(dummyWorkspace, { recursive: true });

  try {
    const store = new SessionStore(dummyWorkspace);

    // 1. Create session
    const session = store.createSession('Test Task');
    assert.ok(session.id.startsWith('sess_'));
    assert.strictEqual(session.task, 'Test Task');

    // 2. Add message
    store.addMessage('user', 'Build a math utility');
    assert.strictEqual(session.messages.length, 1);

    // 3. File modification & Undo
    const testFile = path.join(dummyWorkspace, 'calc.js');
    fs.writeFileSync(testFile, 'module.exports = { add: (a,b) => a+b };', 'utf8');

    // Make backup
    const backupDir = path.join(dummyWorkspace, '.fixen', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, 'calc.js.bak');
    fs.copyFileSync(testFile, backupFile);

    // Modify file
    fs.writeFileSync(testFile, 'module.exports = { corrupted: true };', 'utf8');

    store.recordFileModification('calc.js', path.relative(dummyWorkspace, backupFile), 'edit');

    // Perform Undo
    const undoRes = store.undoLastModifications();
    assert.strictEqual(undoRes.success, true);
    assert.ok(undoRes.restoredFiles.includes('calc.js'));

    const restoredContent = fs.readFileSync(testFile, 'utf8');
    assert.ok(restoredContent.includes('add: (a,b) => a+b'));

    return { name: 'session.test.js', passed: true };
  } finally {
    try {
      fs.rmSync(dummyWorkspace, { recursive: true, force: true });
    } catch {}
  }
}

module.exports = { run };
