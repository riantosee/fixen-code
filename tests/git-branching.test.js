'use strict';

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');
const GitManager = require('../src/git/git-manager');

module.exports = { run: async function gitBranchingTest() {
  const tmpDir = path.join(os.tmpdir(), `fixen-gitbr-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Init a git repo
    execSync('git init', { cwd: tmpDir, stdio: 'ignore', windowsHide: true });
    execSync('git config user.email "test@fixen.dev"', { cwd: tmpDir, stdio: 'ignore', windowsHide: true });
    execSync('git config user.name "Fixen Test"', { cwd: tmpDir, stdio: 'ignore', windowsHide: true });

    // Create initial commit
    fs.writeFileSync(path.join(tmpDir, 'init.txt'), 'initial', 'utf8');
    execSync('git add -A', { cwd: tmpDir, stdio: 'ignore', windowsHide: true });
    execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'ignore', windowsHide: true });

    const git = new GitManager(tmpDir);

    // Test 1: Create branch checkpoint
    fs.writeFileSync(path.join(tmpDir, 'changed.txt'), 'modified content', 'utf8');
    const checkpoint = git.createBranchCheckpoint('test task');

    assert.ok(checkpoint, 'Should return checkpoint object');
    assert.ok(checkpoint.branch.startsWith('fixen/checkpoint-'), 'Branch name should match pattern');
    assert.ok(checkpoint.originalBranch, 'Should have original branch');

    // Verify we're back on original branch
    const currentBranch = git.execGit('branch --show-current').output;
    assert.strictEqual(currentBranch, checkpoint.originalBranch, 'Should return to original branch');

    // Test 2: List checkpoint branches
    const branches = git.listCheckpointBranches();
    assert.ok(branches.length >= 1, 'Should find at least one checkpoint branch');
    assert.ok(branches[0].branch.includes('checkpoint'), 'Branch name should contain checkpoint');
    assert.ok(branches[0].timestamp > 0, 'Should parse timestamp');

    // Test 3: Create another checkpoint (no changes)
    const noChange = git.createBranchCheckpoint('no changes');
    // May return with message about no changes or null
    // Just verify it doesn't throw

    // Test 4: Cleanup old branches (none should be old enough)
    const deleted = git.cleanupCheckpointBranches(0); // Delete all
    assert.ok(deleted >= 1, 'Should delete at least one checkpoint branch');

    const afterCleanup = git.listCheckpointBranches();
    assert.strictEqual(afterCleanup.length, 0, 'All checkpoint branches should be cleaned up');

  } finally {
    // Cleanup
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      try {
        execSync(`rmdir /s /q "${tmpDir}"`, { stdio: 'ignore', windowsHide: true });
      } catch {}
    }
  }
} };
