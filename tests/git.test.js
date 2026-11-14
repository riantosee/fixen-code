'use strict';

const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const GitManager = require('../src/git/git-manager');

function run() {
  const git = new GitManager(process.cwd());

  assert.strictEqual(typeof git.hasGitInstalled, 'boolean');
  assert.strictEqual(typeof git.isRepo, 'boolean');

  // Status check shouldn't crash
  const status = git.status();
  assert.ok(status !== null);
  assert.strictEqual(typeof status.isRepo, 'boolean');

  // Test in non-repo folder
  const nonRepo = path.join(os.tmpdir(), 'fixen-non-repo-' + Date.now());
  fs.mkdirSync(nonRepo, { recursive: true });
  try {
    const gitNon = new GitManager(nonRepo);
    assert.strictEqual(gitNon.isRepo, false);
    const nonStatus = gitNon.status();
    assert.strictEqual(nonStatus.isRepo, false);
  } finally {
    try {
      fs.rmSync(nonRepo, { recursive: true, force: true });
    } catch {}
  }

  return { name: 'git.test.js', passed: true };
}

module.exports = { run };
