'use strict';

const readline = require('readline');
const colors = require('./colors');
const Orchestrator = require('../core/orchestrator');
const GitManager = require('../git/git-manager');
const ProjectScanner = require('../intelligence/project-scanner');
const UI = require('./ui');

class Repl {
  constructor(workspace = process.cwd()) {
    this.workspace = workspace;
    this.orchestrator = new Orchestrator({
      workspace: this.workspace,
      diffPreviewHandler: UI.confirmDiff.bind(UI),
      commandApprovalHandler: UI.confirmCommand.bind(UI),
      onStatus: (step, desc) => {
        console.log(`${colors.cyan('▸')} ${colors.bold(step)}: ${desc}`);
      },
      onToolStart: (tool, args) => {
        console.log(`  ${colors.dim('⚙')} ${colors.cyan(tool)} ${colors.gray(JSON.stringify(args).slice(0, 120))}`);
      },
      onToolEnd: (tool, res) => {
        if (res.success) {
          console.log(`  ${colors.green('✓')} ${colors.gray(tool + ' completed')}`);
        } else {
          console.log(`  ${colors.red('✗')} ${colors.red(tool + ' failed: ' + res.error)}`);
        }
      },
      onPlan: (plan) => {
        if (plan && plan.steps) {
          console.log(colors.bold('\nPlan Generated:'));
          for (const s of plan.steps) {
            console.log(`  ${s.id}. [${s.action.toUpperCase()}] ${s.description}`);
          }
          console.log('');
        }
      }
    });

    this.git = new GitManager(this.workspace);
    this.scanner = new ProjectScanner(this.workspace);
  }

  getPromptString() {
    const mode = this.orchestrator.getMode().toUpperCase();
    const modeColor = {
      AUTO: 'green',
      CODE: 'yellow',
      PLAN: 'cyan',
      ASK: 'magenta',
      REVIEW: 'blue'
    }[mode] || 'cyan';

    return `${colors[modeColor](`[${mode}]`)} fixen> `;
  }

  showHelp() {
    console.log(colors.bold('\nFIXEN CODE Interactive Commands:'));
    console.log(`  ${colors.cyan('/help')}       - Show this help menu`);
    console.log(`  ${colors.cyan('/auto')}       - Switch to Autonomous Mode (plan, code, test, verify)`);
    console.log(`  ${colors.cyan('/ask')}        - Switch to Ask Mode (read-only questions & explanations)`);
    console.log(`  ${colors.cyan('/plan')}       - Switch to Plan Mode (generate step-by-step plans)`);
    console.log(`  ${colors.cyan('/code')}       - Switch to Code Mode (ask before file modifications)`);
    console.log(`  ${colors.cyan('/review')}     - Switch to Review Mode (security & code quality review)`);
    console.log(`  ${colors.cyan('/workspace')}  - View project structure & file tree`);
    console.log(`  ${colors.cyan('/status')}     - Show repository status & active settings`);
    console.log(`  ${colors.cyan('/skills')}     - Show active engineering skills`);
    console.log(`  ${colors.cyan('/resume')}     - Resume last interrupted session`);
    console.log(`  ${colors.cyan('/diff')}       - View uncommitted git changes`);
    console.log(`  ${colors.cyan('/undo')}       - Revert modifications made in the current session`);
    console.log(`  ${colors.cyan('/clear')}      - Clear screen`);
    console.log(`  ${colors.cyan('/exit')}       - Exit FIXEN CODE\n`);
  }

  async handleSlashCommand(cmdLine) {
    const parts = cmdLine.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (cmd) {
      case '/help':
        this.showHelp();
        return true;
      case '/auto':
        this.orchestrator.setMode('auto');
        console.log(colors.success('Switched to AUTO Mode. Autonomous execution within workspace.'));
        return true;
      case '/ask':
        this.orchestrator.setMode('ask');
        console.log(colors.success('Switched to ASK Mode. Read-only codebase queries.'));
        return true;
      case '/plan':
        if (arg) {
          await this.orchestrator.runTask(arg);
        } else {
          this.orchestrator.setMode('plan');
          console.log(colors.success('Switched to PLAN Mode. Plans will be created without modifying files.'));
        }
        return true;
      case '/code':
        this.orchestrator.setMode('code');
        console.log(colors.success('Switched to CODE Mode. Will prompt before file modifications.'));
        return true;
      case '/review':
        this.orchestrator.setMode('review');
        console.log(colors.success('Switched to REVIEW Mode.'));
        if (arg) {
          await this.orchestrator.runTask(arg);
        }
        return true;
      case '/workspace':
        console.log(colors.bold('\nProject File Tree:'));
        console.log(this.scanner.generateTree(3) + '\n');
        return true;
      case '/status':
        console.log(colors.bold('\nStatus:'));
        console.log(`  Mode: ${this.orchestrator.getMode()}`);
        console.log(`  Workspace: ${this.workspace}`);
        const gitStatus = this.git.status();
        console.log(`  Git: ${gitStatus.isRepo ? (gitStatus.hasChanges ? 'Dirty (' + gitStatus.files.length + ' changed)' : 'Clean') : 'Not a git repo'}`);
        return true;
      case '/diff':
        const diffRes = this.git.diff();
        console.log(colors.bold('\nGit Diff:'));
        console.log(diffRes.diff || 'No uncommitted changes.\n');
        return true;
      case '/skills':
        const skills = this.orchestrator.skillManager.listSkills();
        console.log(colors.bold('\nActive Engineering Skills:'));
        for (const s of skills) {
          console.log(`  ${s.enabled ? colors.green('●') : colors.gray('○')} ${colors.bold(s.name)}: ${s.description || 'No description'}`);
        }
        console.log('');
        return true;
      case '/resume':
        try {
          console.log(colors.cyan('\nResuming previous session...'));
          const resumeResult = await this.orchestrator.resumeTask(arg || null);
          console.log(colors.bold('\n--- Resumed Execution Summary ---'));
          console.log(resumeResult.summary || 'Task completed.');
        } catch (err) {
          console.log(colors.error(err.message));
        }
        return true;
      case '/undo':
        const undoRes = this.orchestrator.sessionStore.undoLastModifications();
        if (undoRes.success) {
          console.log(colors.success(`Restored ${undoRes.restoredFiles.length} files:`));
          for (const f of undoRes.restoredFiles) {
            console.log(`  - ${f}`);
          }
        } else {
          console.log(colors.warn(undoRes.message));
        }
        return true;
      case '/clear':
        console.clear();
        return true;
      case '/exit':
      case '/quit':
        console.log(colors.gray('\nGoodbye!\n'));
        process.exit(0);
        return true;
      default:
        console.log(colors.error(`Unknown command: ${cmd}. Type /help for available commands.`));
        return true;
    }
  }

  async start() {
    console.log(colors.dim('Type your coding task or /help for interactive commands. Press Ctrl+C to exit.\n'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.getPromptString()
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        rl.setPrompt(this.getPromptString());
        rl.prompt();
        return;
      }

      rl.pause();

      try {
        if (trimmed.startsWith('/')) {
          await this.handleSlashCommand(trimmed);
        } else {
          console.log('');
          const result = await this.orchestrator.runTask(trimmed);
          console.log('\n' + colors.bold('--- Result ---'));
          console.log(result.summary || 'Task completed.');
          if (result.modifiedFiles && result.modifiedFiles.length > 0) {
            console.log(colors.cyan('\nModified files:'));
            for (const f of result.modifiedFiles) {
              console.log(`  - ${f}`);
            }
          }
          console.log('');
        }
      } catch (err) {
        console.log(colors.error(`\nError: ${err.message}\n`));
      }

      rl.setPrompt(this.getPromptString());
      rl.prompt();
    });

    rl.on('close', () => {
      console.log(colors.gray('\nExiting FIXEN CODE.'));
      process.exit(0);
    });
  }
}

module.exports = Repl;
