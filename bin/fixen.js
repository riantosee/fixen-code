#!/usr/bin/env node
'use strict';

const path = require('path');
const { printBanner } = require('../src/cli/banner');
const colors = require('../src/cli/colors');
const Commands = require('../src/cli/commands');
const Repl = require('../src/cli/repl');
const Orchestrator = require('../src/core/orchestrator');
const CheckpointManager = require('../src/memory/checkpoint-manager');
const ConfigManager = require('../src/config/config-manager');
const UpdateNotifier = require('../src/utils/update-notifier');
const StreamRenderer = require('../src/cli/stream-renderer');
const { renderSummaryCard } = require('../src/cli/summary-card');
const UI = require('../src/cli/ui');
const pkg = require('../package.json');

let activeOrchestrator = null;

// Graceful signal handling for crash & interruption recovery
process.on('SIGINT', () => {
  console.log(colors.yellow('\n\n[FIXEN] Interruption signal received (SIGINT). Safely saving session checkpoint...'));
  if (activeOrchestrator) {
    activeOrchestrator.cancelActiveTask();
  }
  process.exit(130);
});

process.on('SIGTERM', () => {
  if (activeOrchestrator) {
    activeOrchestrator.cancelActiveTask();
  }
  process.exit(143);
});

async function main() {
  const args = process.argv.slice(2);
  const configManager = new ConfigManager(process.cwd());

  // Check for updates in non-blocking way
  const notifier = new UpdateNotifier(pkg.version);
  const updatePromise = notifier.check();

  // Flags check
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`FIXEN CODE v${pkg.version}`);
    process.exit(0);
  }

  if (args.includes('--help') || args.includes('-h')) {
    printBanner(pkg.version, configManager.config);
    console.log(`
Usage:
  fixen                          Start interactive REPL
  fixen "task description"       Run an autonomous task directly
  fixen resume [sessionId]       Resume an interrupted/crashed session
  fixen upgrade                  Check for new updates from npm and upgrade
  fixen skills [list|info]       List or inspect engineering skills
  fixen chat                     Start interactive REPL
  fixen plan "task description"  Generate an implementation plan only
  fixen review [path]            Run code quality & security review
  fixen doctor                   Check environment, API keys, and platform
  fixen config [get|set|list]    Inspect or modify configuration
  fixen models                   List supported AI models and providers
  fixen init                     Initialize FIXEN CODE in current directory
  fixen --version                Show version
  fixen --help                   Show this help menu

Options:
  --provider <name>              Select provider (groq, openai, gemini, ollama)
  --model <name>                 Select model name
  --full-auto                    Explicitly allow full autonomy without prompts
`);
    process.exit(0);
  }

  const firstArg = args[0];

  // Specific subcommands
  if (firstArg === 'doctor') {
    return Commands.doctor(process.cwd());
  }

  if (firstArg === 'config') {
    return Commands.config(args.slice(1), process.cwd());
  }

  if (firstArg === 'models') {
    return Commands.models(process.cwd());
  }

  if (firstArg === 'skills') {
    return Commands.skills(args.slice(1), process.cwd());
  }

  if (firstArg === 'upgrade' || firstArg === 'update') {
    return Commands.upgrade(pkg.version);
  }

  if (firstArg === 'resume') {
    const sessionId = args[1] || null;
    printBanner(pkg.version, configManager.config);
    return Commands.resume(sessionId, process.cwd());
  }

  if (firstArg === 'init') {
    return Commands.init(process.cwd());
  }

  if (firstArg === 'plan') {
    const task = args.slice(1).join(' ');
    if (!task) {
      console.log(colors.error('Please specify a task to plan: fixen plan "your task"'));
      process.exit(1);
    }
    printBanner(pkg.version, configManager.config);
    return Commands.runPlan(task, process.cwd());
  }

  if (firstArg === 'review') {
    const target = args.slice(1).join(' ');
    printBanner(pkg.version, configManager.config);
    return Commands.runReview(target, process.cwd());
  }

  // Interactive REPL or direct task execution
  printBanner(pkg.version, configManager.config);

  // Check update notice
  try {
    const updateInfo = await updatePromise;
    if (updateInfo && updateInfo.hasUpdate) {
      process.stdout.write(notifier.renderAlert(updateInfo));
    }
  } catch {}

  // Check for interrupted session before starting fresh
  const checkpointManager = new CheckpointManager(process.cwd());
  const interrupted = checkpointManager.getLatestInterruptedSession();

  if (!firstArg || firstArg === 'chat') {
    if (interrupted) {
      const timeAgo = new Date(interrupted.updatedAt).toLocaleTimeString();
      console.log(colors.yellow(`\n⚠ Detected an interrupted task: "${interrupted.task}" (Session: ${interrupted.sessionId}, ${timeAgo})`));
      const shouldResume = await UI.confirm('Would you like to resume this previous work?', true);
      if (shouldResume) {
        return Commands.resume(interrupted.sessionId, process.cwd());
      }
    }

    const repl = new Repl(process.cwd());
    return repl.start();
  }

  // Direct task execution
  const task = args.filter((a) => !a.startsWith('--')).join(' ');
  const fullAuto = args.includes('--full-auto');

  let directStreamRenderer = null;

  const orchestrator = new Orchestrator({
    workspace: process.cwd(),
    mode: 'auto',
    permissionLevel: fullAuto ? 5 : 4,
    diffPreviewHandler: UI.confirmDiff.bind(UI),
    commandApprovalHandler: UI.confirmCommand.bind(UI),
    onStatus: (step, desc) => {
      if (directStreamRenderer && directStreamRenderer.isStreaming) {
        directStreamRenderer.end();
        directStreamRenderer = null;
      }
      console.log(`${colors.cyan('▸')} ${colors.bold(step)}: ${desc}`);
    },
    onToken: (token) => {
      if (!directStreamRenderer) {
        directStreamRenderer = new StreamRenderer({ linePrefix: '  ' });
        directStreamRenderer.start();
      }
      directStreamRenderer.onToken(token);
    },
    onToolStart: (tool, toolArgs) => {
      console.log(`  ${colors.dim('⚙')} ${colors.cyan(tool)} ${colors.gray(JSON.stringify(toolArgs).slice(0, 100))}`);
    },
    onToolEnd: (tool, res) => {
      if (res.success) {
        console.log(`  ${colors.green('✔')} ${colors.gray(tool + ' completed')}`);
      } else {
        console.log(`  ${colors.red('✗')} ${colors.red(tool + ' failed: ' + res.error)}`);
      }
    }
  });

  activeOrchestrator = orchestrator;

  console.log(colors.bold(`\nTask: "${task}"\n`));
  const startTime = Date.now();
  const result = await orchestrator.runTask(task);
  const durationMs = Date.now() - startTime;

  console.log('\n' + renderSummaryCard(result, {
    durationMs,
    maxIterations: configManager.get('maxIterations', 25),
    usageStats: orchestrator.provider.getUsageStats()
  }) + '\n');
}

main().catch((err) => {
  console.error(colors.error(`\nFatal error: ${err.message}`));
  if (process.env.DEBUG) {
    console.error(err.stack);
  }
  process.exit(1);
});
