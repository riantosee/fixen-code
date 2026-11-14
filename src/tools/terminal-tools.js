'use strict';

const BaseTool = require('./base-tool');

class TerminalTools {
  constructor(executor, permissionManager, options = {}) {
    this.executor = executor;
    this.permissions = permissionManager;
    this.commandCallback = options.onCommandApproval || null;
  }

  getTools() {
    return [this.createExecuteCommandTool()];
  }

  createExecuteCommandTool() {
    return new BaseTool(
      'execute_command',
      'Execute a terminal command in the project environment. Returns stdout, stderr, and exit code.',
      {
        type: 'object',
        required: ['command'],
        properties: {
          command: {
            type: 'string',
            description: 'Shell command line to execute.'
          },
          cwd: {
            type: 'string',
            description: 'Working directory (optional, relative to workspace).'
          },
          timeoutMs: {
            type: 'integer',
            description: 'Timeout in milliseconds (default: 30000).'
          }
        }
      }
    );
  }

  async handleExecuteCommand(args) {
    const { command, cwd, timeoutMs } = args;
    if (!command || typeof command !== 'string') {
      throw new Error('Command string is required');
    }

    const isDangerous = this.executor.isDangerous(command);
    const shouldPrompt = this.permissions.shouldPromptForCommand(command, isDangerous);

    if (shouldPrompt) {
      if (this.commandCallback) {
        const approved = await this.commandCallback({
          command,
          isDangerous,
          permissionLevel: this.permissions.getLevel()
        });
        if (!approved) {
          throw new Error(`User rejected command execution: '${command}'`);
        }
      } else if (this.permissions.getLevel() < 4) {
        throw new Error(`Command execution requires interactive approval at current permission level: '${command}'`);
      }
    }

    const result = await this.executor.execute(command, { cwd, timeoutMs });
    return result;
  }
}

module.exports = TerminalTools;
