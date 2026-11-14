#!/usr/bin/env node
'use strict';

const path = require('path');
const { printBanner } = require('../src/cli/banner');
const colors = require('../src/cli/colors');
const Commands = require('../src/cli/commands');
const Repl = require('../src/cli/repl');
const Orchestrator = require('../src/core/orchestrator');
const UI = require('../src/cli/ui');
const pkg = require('../package.json');

async function main() {
  const args = process.argv.slice(2);

  // Flags check
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`FIXEN CODE v${pkg.version}`);
    process.exit(0);
  }

  if (args.includes('--help') || args.includes('-h')) {
    printBanner(pkg.version);
    console.log(`
Usage:
  fixen                          Start interactive REPL
  fixen "task description"       Run an autonomous task directly
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

  if (firstArg === 'init') {
    return Commands.init(process.cwd());
  }

  if (firstArg === 'plan') {
    const task = args.slice(1).join(' ');
    if (!task) {
      console.log(colors.error('Please specify a task to plan: fixen plan "your task"'));
      process.exit(1);
    }
    printBanner(pkg.version);
    return Commands.runPlan(task, process.cwd());
  }

  if (firstArg === 'review') {
    const target = args.slice(1).join(' ');
    printBanner(pkg.version);
    return Commands.runReview(target, process.cwd());
  }

  // Interactive REPL or direct task execution
  printBanner(pkg.version);

  if (!firstArg || firstArg === 'chat') {
    const repl = new Repl(process.cwd());
    return repl.start();
  }

  // Direct task execution
  const task = args.filter((a) => !a.startsWith('--')).join(' ');
  const fullAuto = args.includes('--full-auto');

  const orchestrator = new Orchestrator({
    workspace: process.cwd(),
    mode: 'auto',
    permissionLevel: fullAuto ? 5 : 4,
    diffPreviewHandler: UI.confirmDiff.bind(UI),
    commandApprovalHandler: UI.confirmCommand.bind(UI),
    onStatus: (step, desc) => {
      console.log(`${colors.cyan('▸')} ${colors.bold(step)}: ${desc}`);
    },
    onToolStart: (tool, toolArgs) => {
      console.log(`  ${colors.dim('⚙')} ${colors.cyan(tool)} ${colors.gray(JSON.stringify(toolArgs).slice(0, 100))}`);
    },
    onToolEnd: (tool, res) => {
      if (res.success) {
        console.log(`  ${colors.green('✓')} ${colors.gray(tool + ' completed')}`);
      } else {
        console.log(`  ${colors.red('✗')} ${colors.red(tool + ' failed: ' + res.error)}`);
      }
    }
  });

  console.log(colors.bold(`\nTask: "${task}"\n`));
  const result = await orchestrator.runTask(task);

  console.log(colors.bold('\n--- Execution Summary ---'));
  console.log(result.summary || 'Task completed.');
  if (result.modifiedFiles && result.modifiedFiles.length > 0) {
    console.log(colors.cyan('\nModified files:'));
    for (const f of result.modifiedFiles) {
      console.log(`  - ${f}`);
    }
  }
}

main().catch((err) => {
  console.error(colors.error(`\nFatal error: ${err.message}`));
  if (process.env.DEBUG) {
    console.error(err.stack);
  }
  process.exit(1);
});
