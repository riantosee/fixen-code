'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const FileTransaction = require('../src/tools/file-transaction');

// Minimal PathGuard mock
class MockPathGuard {
  constructor(workspace) { this.workspace = workspace; }
  resolvePath(p) { return path.resolve(this.workspace, p); }
  getWorkspace() { return this.workspace; }
}

module.exports = { run: async function fileTransactionTest() {
  const tmpDir = path.join(os.tmpdir(), `fixen-tx-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const guard = new MockPathGuard(tmpDir);

  // Test 1: Successful transaction
  const testFile = path.join(tmpDir, 'test.txt');
  fs.writeFileSync(testFile, 'original content', 'utf8');

  const tx = new FileTransaction(guard);
  tx.begin();
  tx.addWrite('test.txt', 'new content');
  tx.addWrite('new-file.txt', 'created by transaction');
  const result = tx.commit();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.filesModified, 2);
  assert.strictEqual(fs.readFileSync(testFile, 'utf8'), 'new content');
  assert.strictEqual(fs.readFileSync(path.join(tmpDir, 'new-file.txt'), 'utf8'), 'created by transaction');

  // Test 2: Failed transaction with rollback
  fs.writeFileSync(testFile, 'before rollback', 'utf8');

  const tx2 = new FileTransaction(guard);
  tx2.begin();
  tx2.addWrite('test.txt', 'will be rolled back');
  tx2.addEdit('nonexistent-for-edit.txt', 'target', 'replacement'); // This will fail

  let caught = false;
  try {
    tx2.commit();
  } catch (err) {
    caught = true;
    assert.ok(err.message.includes('rolled back'), 'Error should mention rollback');
  }

  assert.ok(caught, 'Should throw on failed transaction');
  assert.strictEqual(fs.readFileSync(testFile, 'utf8'), 'before rollback', 'File should be restored after rollback');

  // Test 3: Edit in transaction
  fs.writeFileSync(testFile, 'hello world', 'utf8');

  const tx3 = new FileTransaction(guard);
  tx3.begin();
  tx3.addEdit('test.txt', 'world', 'universe');
  const r3 = tx3.commit();

  assert.strictEqual(r3.success, true);
  assert.strictEqual(fs.readFileSync(testFile, 'utf8'), 'hello universe');

  // Test 4: getModifiedFiles
  const tx4 = new FileTransaction(guard);
  tx4.begin();
  tx4.addWrite('a.txt', 'a');
  tx4.addWrite('b.txt', 'b');
  assert.deepStrictEqual(tx4.getModifiedFiles(), ['a.txt', 'b.txt']);
  tx4.commit();

  // Cleanup
  try {
    const files = fs.readdirSync(tmpDir);
    for (const f of files) {
      const fp = path.join(tmpDir, f);
      if (fs.statSync(fp).isFile()) fs.unlinkSync(fp);
    }
    fs.rmdirSync(tmpDir);
  } catch {}
} };
