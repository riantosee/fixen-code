'use strict';

const BaseTool = require('./base-tool');

class GitTools {
  constructor(gitManager) {
    this.git = gitManager;
  }

  getTools() {
    return [
      new BaseTool('git_status', 'Get the current git status of the workspace.', {
        type: 'object',
        properties: {}
      }),
      new BaseTool('git_diff', 'View uncommitted git diff in the workspace.', {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            description: 'Specific file to diff (optional).'
          }
        }
      }),
      new BaseTool('git_checkpoint', 'Create an automatic checkpoint snapshot before modifying files.', {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Description of the checkpoint.'
          }
        }
      }),
      new BaseTool('git_restore', 'Roll back uncommitted changes to a file or the entire repository.', {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            description: 'File to restore (default: ".").'
          }
        }
      }),
      new BaseTool('git_commit', 'Commit staged or working changes with a clear message.', {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            description: 'Commit message.'
          }
        }
      })
    ];
  }

  async handleGitStatus() {
    return this.git.status();
  }

  async handleGitDiff(args = {}) {
    return this.git.diff(args.file);
  }

  async handleGitCheckpoint(args = {}) {
    return this.git.createCheckpoint(args.description);
  }

  async handleGitRestore(args = {}) {
    return this.git.restore(args.file || '.');
  }

  async handleGitCommit(args) {
    return this.git.commit(args.message);
  }
}

module.exports = GitTools;
