'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class GitManager {
  constructor(workspace = process.cwd()) {
    this.workspace = path.resolve(workspace);
    this.hasGitInstalled = this.checkGitInstalled();
    this.isRepo = this.checkIsRepo();
  }

  execGit(args, options = {}) {
    if (!this.hasGitInstalled) {
      throw new Error('Git is not installed or not in PATH');
    }
    const cmd = `git ${args}`;
    try {
      const output = execSync(cmd, {
        cwd: options.cwd || this.workspace,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeoutMs || 15000,
        windowsHide: true
      });
      return { success: true, output: output.trim(), error: null };
    } catch (err) {
      return {
        success: false,
        output: err.stdout ? err.stdout.toString('utf8').trim() : '',
        error: err.stderr ? err.stderr.toString('utf8').trim() : err.message
      };
    }
  }

  checkGitInstalled() {
    try {
      execSync('git --version', { stdio: 'ignore', windowsHide: true });
      return true;
    } catch {
      return false;
    }
  }

  checkIsRepo() {
    if (!this.hasGitInstalled) return false;
    const res = this.execGit('rev-parse --is-inside-work-tree');
    return res.success && res.output === 'true';
  }

  status() {
    if (!this.isRepo) return { isRepo: false, status: 'Not a git repository' };
    const res = this.execGit('status --short');
    return {
      isRepo: true,
      hasChanges: Boolean(res.output && res.output.length > 0),
      raw: res.output,
      files: res.output ? res.output.split('\n').map((l) => l.trim()) : []
    };
  }

  diff(file = '') {
    if (!this.isRepo) return { isRepo: false, diff: '' };
    const res = this.execGit(file ? `diff -- "${file}"` : 'diff');
    return {
      isRepo: true,
      diff: res.output || (res.success ? 'No changes' : res.error)
    };
  }

  log(maxCount = 5) {
    if (!this.isRepo) return [];
    const res = this.execGit(`log -n ${maxCount} --oneline`);
    if (!res.success) return [];
    return res.output.split('\n').filter(Boolean).map((line) => {
      const [hash, ...msgParts] = line.split(' ');
      return { hash, message: msgParts.join(' ') };
    });
  }

  createCheckpoint(description = 'Auto-checkpoint before fixen task') {
    if (!this.isRepo) return null;
    const timestamp = Date.now();
    const branchRes = this.execGit('branch --show-current');
    const branch = branchRes.output || 'main';

    // Stage changes and create a stash or temporary branch
    const stashRes = this.execGit(`stash create "fixen-checkpoint-${timestamp}: ${description}"`);
    const commitHash = stashRes.output || null;

    return {
      timestamp,
      branch,
      commitHash,
      description
    };
  }

  add(files = '.') {
    if (!this.isRepo) return false;
    const res = this.execGit(`add ${files}`);
    return res.success;
  }

  commit(message) {
    if (!this.isRepo) return false;
    const cleanMsg = message.replace(/"/g, '\\"');
    const res = this.execGit(`commit -m "${cleanMsg}"`);
    return res.success;
  }

  restore(file = '.') {
    if (!this.isRepo) return false;
    const res = this.execGit(`restore --staged --worktree ${file}`);
    return res.success;
  }

  createBranchCheckpoint(taskDescription = 'checkpoint') {
    if (!this.isRepo) return null;
    const timestamp = Date.now();
    const branchRes = this.execGit('branch --show-current');
    const originalBranch = branchRes.output || 'main';
    const safeName = taskDescription.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 40);
    const branchName = `fixen/checkpoint-${timestamp}-${safeName}`;

    // Stage all changes
    this.execGit('add -A');

    // Check if there's anything to commit
    const statusRes = this.execGit('status --porcelain');
    if (!statusRes.output) {
      return { branch: branchName, commitHash: null, originalBranch, timestamp, message: 'No changes to checkpoint' };
    }

    // Create orphan-like checkpoint: branch, commit, switch back
    const createRes = this.execGit(`checkout -b "${branchName}"`);
    if (!createRes.success) return null;

    const commitRes = this.execGit(`commit -m "fixen checkpoint: ${taskDescription}"`);
    const commitHash = commitRes.success ? this.execGit('rev-parse HEAD').output : null;

    // Return to original branch
    this.execGit(`checkout "${originalBranch}"`);

    return { branch: branchName, commitHash, originalBranch, timestamp };
  }

  restoreBranchCheckpoint(checkpointBranch) {
    if (!this.isRepo) return { success: false, error: 'Not a git repo' };
    const res = this.execGit(`checkout "${checkpointBranch}"`);
    return { success: res.success, error: res.error };
  }

  listCheckpointBranches() {
    if (!this.isRepo) return [];
    const res = this.execGit('branch --list "fixen/checkpoint-*"');
    if (!res.success || !res.output) return [];

    return res.output.split('\n').map(line => {
      const branch = line.replace(/^\*?\s+/, '').trim();
      const match = branch.match(/checkpoint-(\d+)/);
      return { branch, timestamp: match ? parseInt(match[1], 10) : 0 };
    }).filter(b => b.branch);
  }

  cleanupCheckpointBranches(olderThanMs = 7 * 24 * 60 * 60 * 1000) {
    const branches = this.listCheckpointBranches();
    const cutoff = Date.now() - olderThanMs;
    let deleted = 0;

    for (const { branch, timestamp } of branches) {
      if (timestamp && timestamp < cutoff) {
        const res = this.execGit(`branch -D "${branch}"`);
        if (res.success) deleted++;
      }
    }
    return deleted;
  }
}

module.exports = GitManager;
