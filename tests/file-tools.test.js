'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const PathGuard = require('../src/security/path-guard');
const { PermissionManager, PERMISSION_LEVELS } = require('../src/security/permissions');
const FileTools = require('../src/tools/file-tools');
const { createDiff } = require('../src/utils/diff');

async function run() {
  const testWorkspace = path.join(os.tmpdir(), 'fixen-file-test-' + Date.now());
  fs.mkdirSync(testWorkspace, { recursive: true });

  try {
    const pathGuard = new PathGuard(testWorkspace);
    const pm = new PermissionManager(PERMISSION_LEVELS.FULL_AUTO);
    const fileTools = new FileTools(pathGuard, pm);

    // 1. Write file
    const writeRes = await fileTools.handleWriteFile({
      path: 'src/hello.js',
      content: 'console.log("hello world");\n'
    });
    assert.strictEqual(writeRes.success, true);
    assert.strictEqual(writeRes.action, 'created');
    assert.ok(fs.existsSync(path.join(testWorkspace, 'src', 'hello.js')));

    // 2. Read file
    const readRes = await fileTools.handleReadFile({ path: 'src/hello.js' });
    assert.ok(readRes.content.includes('hello world'));
    assert.strictEqual(readRes.totalLines, 2);

    // 3. Edit file
    const editRes = await fileTools.handleEditFile({
      path: 'src/hello.js',
      target: 'hello world',
      replacement: 'hello FIXEN'
    });
    assert.strictEqual(editRes.success, true);
    assert.ok(editRes.backup, 'Backup should be created on edit');
    const readAfterEdit = await fileTools.handleReadFile({ path: 'src/hello.js' });
    assert.ok(readAfterEdit.content.includes('hello FIXEN'));

    // Edit non-matching target should fail
    await assert.rejects(async () => {
      await fileTools.handleEditFile({
        path: 'src/hello.js',
        target: 'non-existent-sequence',
        replacement: 'new'
      });
    }, /Target text sequence not found/);

    // 4. Search files
    const searchRes = await fileTools.handleSearchFiles({ query: 'FIXEN' });
    assert.strictEqual(searchRes.totalMatches, 1);
    assert.strictEqual(searchRes.matches[0].file, 'src/hello.js');

    // 5. Inspect file
    const inspectRes = await fileTools.handleInspectFile({ path: 'src/hello.js' });
    assert.strictEqual(inspectRes.type, 'file');
    assert.ok(inspectRes.sizeBytes > 0);

    // 6. Diff utility
    const diff = createDiff('line 1\nold line\nline 3\n', 'line 1\nnew line\nline 3\n', 'sample.txt');
    assert.ok(diff.includes('-old line'));
    assert.ok(diff.includes('+new line'));

    // 7. Delete file
    const delRes = await fileTools.handleDeleteFile({ path: 'src/hello.js' });
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(fs.existsSync(path.join(testWorkspace, 'src', 'hello.js')), false);

    return { name: 'file-tools.test.js', passed: true };
  } finally {
    // Cleanup
    try {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    } catch {}
  }
}

module.exports = { run };
