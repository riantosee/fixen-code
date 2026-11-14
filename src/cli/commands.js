'use strict';

const path = require('path');
const fs = require('fs');
const colors = require('./colors');
const { getPlatformInfo } = require('../terminal/platform');
const ConfigManager = require('../config/config-manager');
const GitManager = require('../git/git-manager');
const ProviderFactory = require('../providers/provider-factory');
const Orchestrator = require('../core/orchestrator');
const ProjectScanner = require('../intelligence/project-scanner');
const UI = require('./ui');

class Commands {
  static async doctor(workspace = process.cwd()) {
    console.log(colors.bold('\n🔍 FIXEN CODE SYSTEM DOCTOR\n'));

    // 1. Platform & Node
    const platform = getPlatformInfo();
    console.log(colors.bold('Platform & Runtime:'));
    console.log(`  OS: ${colors.cyan(platform.os)} (${platform.arch})`);
    console.log(`  Termux: ${platform.isTermux ? colors.green('Yes') : colors.gray('No')}`);
    console.log(`  Node.js: ${colors.green(platform.nodeVersion)} (v18+ supported)`);
    console.log(`  Shell: ${colors.cyan(platform.shell)}`);
    console.log(`  Terminal: ${platform.columns}x${platform.rows} (Colors: ${platform.supportsColor ? colors.green('Yes') : colors.yellow('No')})`);

    // 2. Git
    const git = new GitManager(workspace);
    console.log(colors.bold('\nVersion Control:'));
    if (git.hasGitInstalled) {
      console.log(`  Git: ${colors.green('Installed')}`);
      console.log(`  Workspace Repo: ${git.isRepo ? colors.green('Initialized git repo') : colors.yellow('Not a git repository')}`);
    } else {
      console.log(`  Git: ${colors.red('Not found in PATH')}`);
    }

    // 3. Configuration & Providers
    const config = new ConfigManager(workspace);
    const activeProvider = config.get('provider', 'groq');
    const activeModel = config.get('model', 'llama-3.3-70b-versatile');

    console.log(colors.bold('\nAI Providers:'));
    console.log(`  Active Provider: ${colors.cyan(activeProvider)}`);
    console.log(`  Active Model: ${colors.cyan(activeModel)}`);

    // Check Groq Key
    const groqKey = config.getApiKey('groq');
    if (groqKey) {
      console.log(`  Groq API Key: ${colors.green('Configured')} (${groqKey.slice(0, 7)}...)`);
      const spinner = UI.spinner('Testing Groq connection');
      try {
        const groq = ProviderFactory.create('groq', config);
        const testRes = await groq.testConnection();
        if (testRes.success) {
          spinner.stop(colors.success(`Groq API Connected (${testRes.model})`));
        } else {
          spinner.stop(colors.error(`Groq Connection Failed: ${testRes.error}`));
        }
      } catch (err) {
        spinner.stop(colors.error(`Groq test error: ${err.message}`));
      }
    } else {
      console.log(`  Groq API Key: ${colors.yellow('Missing')} (Set via export GROQ_API_KEY=... or fixen config)`);
    }

    // Check OpenAI Key
    const openaiKey = config.getApiKey('openai');
    console.log(`  OpenAI API Key: ${openaiKey ? colors.green('Configured') : colors.gray('Not set')}`);

    // Check Gemini Key
    const geminiKey = config.getApiKey('gemini');
    console.log(`  Gemini API Key: ${geminiKey ? colors.green('Configured') : colors.gray('Not set')}`);

    // Check Ollama
    try {
      const ollama = ProviderFactory.create('ollama', config);
      const ollamaTest = await ollama.testConnection();
      console.log(`  Ollama Local: ${ollamaTest.success ? colors.green('Active at ' + ollamaTest.endpoint) : colors.gray('Offline / Not running')}`);
    } catch {
      console.log(`  Ollama Local: ${colors.gray('Offline / Not reachable')}`);
    }

    // 4. Workspace
    console.log(colors.bold('\nWorkspace:'));
    console.log(`  Path: ${colors.cyan(workspace)}`);
    const fixenDir = path.join(workspace, '.fixen');
    console.log(`  .fixen directory: ${fs.existsSync(fixenDir) ? colors.green('Initialized') : colors.gray('Not initialized (run fixen init)')}`);

    console.log(colors.bold('\nDoctor check complete.\n'));
  }

  static async config(args = [], workspace = process.cwd()) {
    const config = new ConfigManager(workspace);
    const sub = args[0];

    if (!sub || sub === 'list') {
      console.log(colors.bold('\nFixen Configuration:'));
      console.log(JSON.stringify(config.get(), null, 2));
      return;
    }

    if (sub === 'get') {
      const key = args[1];
      if (!key) {
        console.log(colors.error('Specify key to get. Example: fixen config get provider'));
        return;
      }
      const val = config.get(key);
      console.log(`${key} = ${typeof val === 'object' ? JSON.stringify(val, null, 2) : val}`);
      return;
    }

    if (sub === 'set') {
      const key = args[1];
      const val = args[2];
      const isGlobal = args.includes('--global') || args.includes('-g');

      if (!key || val === undefined) {
        console.log(colors.error('Usage: fixen config set <key> <value> [--global]'));
        return;
      }

      let parsedVal = val;
      if (val === 'true') parsedVal = true;
      else if (val === 'false') parsedVal = false;
      else if (!isNaN(Number(val))) parsedVal = Number(val);

      if (isGlobal) {
        config.setGlobal(key, parsedVal);
        console.log(colors.success(`Set global config: ${key} = ${parsedVal}`));
      } else {
        config.setProject(key, parsedVal);
        console.log(colors.success(`Set project config: ${key} = ${parsedVal}`));
      }
    }
  }

  static async models(workspace = process.cwd()) {
    const config = new ConfigManager(workspace);
    const activeProvider = config.get('provider', 'groq');
    const activeModel = config.get('model');
    const providers = config.get('providers', {});

    console.log(colors.bold('\nAvailable Models & Providers:\n'));

    for (const [pName, pCfg] of Object.entries(providers)) {
      const isCurrent = pName === activeProvider;
      const marker = isCurrent ? colors.green('● (ACTIVE)') : colors.gray('○');
      console.log(`${marker} ${colors.bold(pName.toUpperCase())}:`);
      console.log(`   Endpoint: ${pCfg.endpoint}`);
      if (pCfg.models) {
        for (const m of pCfg.models) {
          const isSelected = isCurrent && m === activeModel;
          console.log(`   ${isSelected ? colors.cyan('★ ' + m + ' [selected]') : '  - ' + m}`);
        }
      }
      console.log('');
    }
  }

  static async init(workspace = process.cwd()) {
    const config = new ConfigManager(workspace);
    const createdPath = config.initProject();
    console.log(colors.success(`Initialized FIXEN CODE in ${colors.cyan(createdPath)}`));
  }

  static async runPlan(task, workspace = process.cwd()) {
    const orchestrator = new Orchestrator({
      workspace,
      mode: 'plan',
      onStatus: (step, desc) => console.log(colors.step(step, desc))
    });

    console.log(colors.bold(`\n📋 Planning Task: "${task}"\n`));
    const result = await orchestrator.runTask(task);
    console.log('\n' + result.summary + '\n');
  }

  static async runReview(target = '', workspace = process.cwd()) {
    const orchestrator = new Orchestrator({
      workspace,
      mode: 'review',
      onStatus: (step, desc) => console.log(colors.step(step, desc))
    });

    console.log(colors.bold(`\n🧐 Code Quality & Security Review\n`));
    const result = await orchestrator.runTask(target || 'Review entire project');
    console.log('\n' + result.summary + '\n');
  }
}

module.exports = Commands;
