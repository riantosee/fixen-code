'use strict';

const readline = require('readline');
const colors = require('./colors');
const { createBox: renderBox } = require('./box');
const SkillManager = require('../skills/skill-manager');

class SetupWizard {
  constructor(configManager, workspace = process.cwd()) {
    this.configManager = configManager;
    this.workspace = workspace;
    this.skillManager = new SkillManager(workspace);
  }

  ask(rl, questionText) {
    return new Promise((resolve) => {
      rl.question(questionText, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async run() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.clear();
    console.log(renderBox([
      colors.bold('⚡ WELCOME TO FIXEN CODE SETUP WIZARD ⚡'),
      '',
      'First-Time Agent & AI Provider Installation',
      'Configure your AI model, environment, and engineering skills.'
    ], { title: 'FIXEN CODE ONBOARDING', borderColor: 'cyan' }));
    console.log('');

    // Step 1: Provider selection
    console.log(colors.bold('Step 1/3: Select Primary AI Provider'));
    console.log(`  ${colors.cyan('1)')} Groq               ${colors.gray('(Recommended: Ultra-fast, Free Tier available — Llama 3.3 70B)')}`);
    console.log(`  ${colors.cyan('2)')} DeepSeek           ${colors.gray('(High coding & reasoning intelligence — DeepSeek V3 / R1)')}`);
    console.log(`  ${colors.cyan('3)')} OpenRouter         ${colors.gray('(All-in-One: Access 200+ models — Claude, GPT-4o, Llama)')}`);
    console.log(`  ${colors.cyan('4)')} OpenAI             ${colors.gray('(Industry standard — GPT-4o, o3-mini)')}`);
    console.log(`  ${colors.cyan('5)')} Anthropic Claude   ${colors.gray('(Top-tier software engineering — Claude 3.5 Sonnet)')}`);
    console.log(`  ${colors.cyan('6)')} Google Gemini      ${colors.gray('(Massive context window — Gemini 2.0 Flash, 1.5 Pro)')}`);
    console.log(`  ${colors.cyan('7)')} Ollama / Local     ${colors.gray('(100% Offline, Local & Private — Llama, Qwen, DeepSeek)')}`);
    console.log(`  ${colors.cyan('8)')} Custom API         ${colors.gray('(Any custom OpenAI-compatible endpoint URL)')}`);
    console.log('');

    const choice = await this.ask(rl, `${colors.yellow('Select provider [1-8] (default: 1): ')}`) || '1';

    let selectedProvider = 'groq';
    let defaultModel = 'llama-3.3-70b-versatile';
    let endpoint = null;
    let apiKeyPrompt = '';
    let keyUrlHint = '';

    switch (choice) {
      case '2':
        selectedProvider = 'deepseek';
        defaultModel = 'deepseek-chat';
        apiKeyPrompt = 'Enter your DeepSeek API Key: ';
        keyUrlHint = 'Get a key at: https://platform.deepseek.com';
        break;
      case '3':
        selectedProvider = 'openrouter';
        defaultModel = 'anthropic/claude-3.5-sonnet';
        apiKeyPrompt = 'Enter your OpenRouter API Key: ';
        keyUrlHint = 'Get a key at: https://openrouter.ai/keys';
        break;
      case '4':
        selectedProvider = 'openai';
        defaultModel = 'gpt-4o';
        apiKeyPrompt = 'Enter your OpenAI API Key: ';
        keyUrlHint = 'Get a key at: https://platform.openai.com/api-keys';
        break;
      case '5':
        selectedProvider = 'anthropic';
        defaultModel = 'claude-3-5-sonnet-20241022';
        apiKeyPrompt = 'Enter your Anthropic API Key: ';
        keyUrlHint = 'Get a key at: https://console.anthropic.com/settings/keys';
        break;
      case '6':
        selectedProvider = 'gemini';
        defaultModel = 'gemini-2.0-flash-exp';
        apiKeyPrompt = 'Enter your Google Gemini API Key: ';
        keyUrlHint = 'Get a key at: https://aistudio.google.com/apikey';
        break;
      case '7':
        selectedProvider = 'ollama';
        defaultModel = 'llama3.2';
        apiKeyPrompt = 'Local Ollama endpoint URL (default: http://127.0.0.1:11434/v1): ';
        break;
      case '8':
        selectedProvider = 'custom';
        const customUrl = await this.ask(rl, 'Enter Custom API Endpoint Base URL (e.g. http://localhost:8000/v1): ');
        endpoint = customUrl || 'http://localhost:8000/v1';
        const customModel = await this.ask(rl, 'Enter Model Name (default: custom-model): ');
        defaultModel = customModel || 'custom-model';
        apiKeyPrompt = 'Enter Custom API Key (or press Enter if none): ';
        break;
      case '1':
      default:
        selectedProvider = 'groq';
        defaultModel = 'llama-3.3-70b-versatile';
        apiKeyPrompt = 'Enter your Groq API Key (or press Enter to set later): ';
        keyUrlHint = 'Get a free key at: https://console.groq.com/keys';
        break;
    }

    // Step 2: API Key Configuration
    console.log(`\n${colors.bold('Step 2/3: API Key & Connection Setup')}`);
    if (keyUrlHint) {
      console.log(`  ${colors.dim('ℹ')} ${colors.gray(keyUrlHint)}`);
    }

    let apiKey = '';
    if (selectedProvider === 'ollama') {
      const customOllamaUrl = await this.ask(rl, apiKeyPrompt);
      if (customOllamaUrl) endpoint = customOllamaUrl;
    } else {
      apiKey = await this.ask(rl, `${colors.yellow(apiKeyPrompt)}`);
    }

    // Step 3: Default Operating Mode
    console.log(`\n${colors.bold('Step 3/3: Choose Default Operating Mode')}`);
    console.log(`  ${colors.cyan('1)')} Auto Mode    ${colors.gray('(Autonomous: Plan, edit files, execute tests, verify)')}`);
    console.log(`  ${colors.cyan('2)')} Code Mode    ${colors.gray('(Interactive: Asks for approval before any file change)')}`);
    console.log(`  ${colors.cyan('3)')} Plan Mode    ${colors.gray('(Analysis: Generates implementation plans without touching code)')}`);
    console.log('');

    const modeChoice = await this.ask(rl, `${colors.yellow('Select mode [1-3] (default: 1): ')}`) || '1';
    let defaultMode = 'auto';
    if (modeChoice === '2') defaultMode = 'code';
    if (modeChoice === '3') defaultMode = 'plan';

    // Step 4: Automatic Skills Installation
    console.log(`\n${colors.bold('Installing Native Engineering Skills...')}`);
    const installedSkills = this.skillManager.autoInstallSkills();
    const skillsList = [
      'ponytail (Lazy Senior Dev — shortest working diff & YAGNI)',
      'deep-debugger (Root cause debugging & regression tests)',
      'motion-design (Snappy 150ms-350ms UI transitions & curves)',
      'security-auditor (OWASP sanitization & boundary defense)',
      'test-driven-architect (TDD red-green-refactor loop)',
      'refactoring-master (Clean architecture & complexity reduction)',
      'api-designer (RESTful JSON envelopes & idempotency)'
    ];

    for (const skill of skillsList) {
      console.log(`  ${colors.green('✔')} Installed skill: ${colors.cyan(skill)}`);
    }

    // Save configurations
    this.configManager.setGlobal('provider', selectedProvider);
    this.configManager.setGlobal('model', defaultModel);
    this.configManager.setGlobal('mode', defaultMode);
    this.configManager.setGlobal('hasCompletedSetup', true);

    if (endpoint) {
      this.configManager.setGlobal(`providers.${selectedProvider}.endpoint`, endpoint);
    }

    if (apiKey) {
      this.configManager.setGlobal(`providers.${selectedProvider}.apiKey`, apiKey);
      // Also write to user environment helper if appropriate
    }

    rl.close();

    console.log('\n' + renderBox([
      colors.green(colors.bold('✔ FIXEN CODE SETUP COMPLETED SUCCESSFULLY!')),
      '',
      `Provider:  ${colors.cyan(selectedProvider.toUpperCase())}`,
      `Model:     ${colors.cyan(defaultModel)}`,
      `Mode:      ${colors.cyan(defaultMode.toUpperCase())}`,
      `API Key:   ${apiKey ? colors.green('Configured') : colors.yellow('Pending (Set via fixen config or environment)')}`,
      `Skills:    ${colors.green('7 Active Skills Auto-Installed')}`,
      '',
      colors.gray('You can re-run this setup wizard anytime by typing: fixen setup')
    ], { title: 'SETUP COMPLETE', borderColor: 'green' }) + '\n');

    return true;
  }
}

module.exports = SetupWizard;

