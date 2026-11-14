'use strict';

const { spawn } = require('child_process');
const { getPlatformInfo } = require('./platform');
const { maskSecrets } = require('../security/secret-guard');

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+[\/\\]/i,
  /rmdir\s+\/s\s+\/q\s+[a-zA-Z]:[\/\\]/i,
  /format\s+[a-zA-Z]:/i,
  /dd\s+if=/i,
  /:\(\)\s*\{\s*:\|:&\s*\};:/,
  /mkfs/i,
  /chmod\s+-R\s+777\s+[\/\\]/i,
  /curl.*\|\s*(ba)?sh/i,
  /wget.*\|\s*(ba)?sh/i
];

class TerminalExecutor {
  constructor(options = {}) {
    this.platform = getPlatformInfo();
    this.defaultTimeoutMs = options.timeoutMs || 30000;
    this.workspace = options.workspace || process.cwd();
    this.customDangerousPatterns = options.dangerousPatterns || [];
  }

  isDangerous(command) {
    if (typeof command !== 'string') return false;
    const trimmed = command.trim();

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) return true;
    }

    for (const pattern of this.customDangerousPatterns) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
      if (regex.test(trimmed)) return true;
    }

    return false;
  }

  /**
   * Execute command in shell
   */
  async execute(command, options = {}) {
    const cwd = options.cwd || this.workspace;
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const env = { ...process.env, ...(options.env || {}) };

    const startTime = Date.now();
    const isDangerous = this.isDangerous(command);

    return new Promise((resolve) => {
      let shellExecutable = this.platform.shell;
      let shellArgs = [];

      if (this.platform.platform === 'win32') {
        if (shellExecutable.toLowerCase().includes('powershell')) {
          shellArgs = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', `& { ${command} }; exit $LASTEXITCODE`];
        } else {
          shellArgs = ['/d', '/s', '/c', command];
        }
      } else {
        // POSIX / Termux
        shellArgs = ['-c', command];
      }

      let stdout = '';
      let stderr = '';
      let killed = false;
      let timedOut = false;

      let child;
      try {
        child = spawn(shellExecutable, shellArgs, {
          cwd,
          env,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } catch (err) {
        return resolve({
          command,
          exitCode: -1,
          stdout: '',
          stderr: `Failed to spawn process: ${err.message}`,
          durationMs: Date.now() - startTime,
          timedOut: false,
          isDangerous
        });
      }

      const timer = setTimeout(() => {
        timedOut = true;
        killed = true;
        try {
          if (this.platform.platform === 'win32') {
            spawn('taskkill', ['/pid', String(child.pid), '/f', '/t']);
          } else {
            child.kill('SIGKILL');
          }
        } catch {
          child.kill();
        }
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf8');
        // Prevent buffer explosion
        if (stdout.length > 500000) {
          stdout = stdout.slice(-500000);
        }
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8');
        if (stderr.length > 200000) {
          stderr = stderr.slice(-200000);
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          command,
          exitCode: -1,
          stdout: maskSecrets(stdout),
          stderr: maskSecrets(`Process error: ${err.message}\n${stderr}`),
          durationMs: Date.now() - startTime,
          timedOut,
          isDangerous
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          command,
          exitCode: timedOut ? 124 : (code ?? (killed ? 137 : 0)),
          stdout: maskSecrets(stdout),
          stderr: maskSecrets(timedOut ? `Command timed out after ${timeoutMs}ms\n${stderr}` : stderr),
          durationMs: Date.now() - startTime,
          timedOut,
          isDangerous
        });
      });
    });
  }
}

module.exports = TerminalExecutor;
