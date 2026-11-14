'use strict';

const path = require('path');
const ConfigManager = require('../config/config-manager');
const PathGuard = require('../security/path-guard');
const { PermissionManager, PERMISSION_LEVELS } = require('../security/permissions');
const AuditLogger = require('../security/audit-logger');
const TerminalExecutor = require('../terminal/executor');
const GitManager = require('../git/git-manager');
const ToolRegistry = require('../tools/tool-registry');
const FileTools = require('../tools/file-tools');
const TerminalTools = require('../tools/terminal-tools');
const GitTools = require('../tools/git-tools');
const ProjectAnalyzer = require('../intelligence/analyzer');
const ProviderFactory = require('../providers/provider-factory');
const SessionStore = require('../memory/session-store');
const CheckpointManager = require('../memory/checkpoint-manager');
const SkillManager = require('../skills/skill-manager');
const PlanningEngine = require('./planning');
const AgentLoop = require('./agent-loop');

class Orchestrator {
  constructor(options = {}) {
    this.options = options;
    this.workspace = path.resolve(options.workspace || process.cwd());
    this.configManager = new ConfigManager(this.workspace);

    this.mode = options.mode || this.configManager.get('mode', 'auto');
    this.permissionLevel = options.permissionLevel || this.configManager.get('permissionLevel', 4);

    this.interactivePrompt = options.interactivePrompt || null;
    this.diffPreviewHandler = options.diffPreviewHandler || null;
    this.commandApprovalHandler = options.commandApprovalHandler || null;

    this.callbacks = {
      onStatus: options.onStatus || (() => {}),
      onToolStart: options.onToolStart || (() => {}),
      onToolEnd: options.onToolEnd || (() => {}),
      onMessage: options.onMessage || (() => {}),
      onPlan: options.onPlan || (() => {})
    };

    this.init();
  }

  init() {
    // 1. Path Guard
    this.pathGuard = new PathGuard(this.workspace);

    // 2. Audit Logger
    this.auditLogger = new AuditLogger(path.join(this.workspace, '.fixen'));

    // 3. Permissions
    this.permissions = new PermissionManager(this.permissionLevel);

    // 4. Terminal Executor
    this.executor = new TerminalExecutor({
      workspace: this.workspace,
      timeoutMs: this.configManager.get('toolTimeoutMs', 30000)
    });

    // 5. Git Manager
    this.git = new GitManager(this.workspace);

    // 6. Tools
    this.fileTools = new FileTools(this.pathGuard, this.permissions, {
      onDiffPreview: this.diffPreviewHandler
    });

    this.terminalTools = new TerminalTools(this.executor, this.permissions, {
      onCommandApproval: this.commandApprovalHandler
    });

    this.gitTools = new GitTools(this.git);

    // Tool Registry
    this.toolRegistry = new ToolRegistry({ auditLogger: this.auditLogger });

    // Register all file tools
    for (const tool of this.fileTools.getTools()) {
      const handlerName = `handle${tool.name.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
      const handler = this.fileTools[handlerName] ? this.fileTools[handlerName].bind(this.fileTools) : null;
      this.toolRegistry.registerTool(tool, handler);
    }

    // Register terminal tools
    for (const tool of this.terminalTools.getTools()) {
      this.toolRegistry.registerTool(tool, this.terminalTools.handleExecuteCommand.bind(this.terminalTools));
    }

    // Register git tools
    for (const tool of this.gitTools.getTools()) {
      const handlerName = `handle${tool.name.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
      const handler = this.gitTools[handlerName] ? this.gitTools[handlerName].bind(this.gitTools) : null;
      this.toolRegistry.registerTool(tool, handler);
    }

    // 7. Intelligence
    this.analyzer = new ProjectAnalyzer(this.workspace);

    // 8. Provider
    const providerName = this.options.provider || this.configManager.get('provider', 'groq');
    this.provider = ProviderFactory.create(providerName, this.configManager);

    // 9. Session Store & Checkpoint Manager
    this.sessionStore = new SessionStore(this.workspace);
    this.checkpointManager = new CheckpointManager(this.workspace);

    // 10. Skills Engine
    this.skillManager = new SkillManager(this.workspace);

    // 11. Planning Engine
    this.planning = new PlanningEngine(this.provider);
  }

  setMode(mode) {
    const validModes = ['ask', 'plan', 'code', 'auto', 'review'];
    if (validModes.includes(mode)) {
      this.mode = mode;
      if (mode === 'ask') {
        this.permissions.setLevel(PERMISSION_LEVELS.READ_ONLY);
      } else if (mode === 'plan') {
        this.permissions.setLevel(PERMISSION_LEVELS.READ_ONLY);
      } else if (mode === 'code') {
        this.permissions.setLevel(PERMISSION_LEVELS.ASK_BEFORE_CHANGES);
      } else if (mode === 'auto') {
        this.permissions.setLevel(PERMISSION_LEVELS.CONTROLLED_AUTO);
      }
    }
  }

  getMode() {
    return this.mode;
  }

  cancelActiveTask() {
    if (this.activeLoop) {
      this.activeLoop.cancel();
    }
  }

  async runTask(task) {
    // Mode-specific routing
    if (this.mode === 'ask') {
      return this.runAskMode(task);
    }

    if (this.mode === 'review') {
      return this.runReviewMode(task);
    }

    // Create session
    this.sessionStore.createSession(task);

    // Auto / Code / Plan mode
    this.activeLoop = new AgentLoop({
      provider: this.provider,
      toolRegistry: this.toolRegistry,
      analyzer: this.analyzer,
      planningEngine: this.planning,
      sessionStore: this.sessionStore,
      checkpointManager: this.checkpointManager,
      skillManager: this.skillManager,
      options: {
        maxIterations: this.configManager.get('maxIterations', 25),
        mode: this.mode,
        ...this.callbacks
      }
    });

    try {
      return await this.activeLoop.run(task);
    } finally {
      this.activeLoop = null;
    }
  }

  async resumeTask(sessionId = null) {
    let checkpoint = null;
    if (sessionId) {
      checkpoint = this.checkpointManager.getCheckpoint(sessionId);
    } else {
      checkpoint = this.checkpointManager.getLatestInterruptedSession();
    }

    if (!checkpoint) {
      throw new Error(sessionId ? `No checkpoint found for session '${sessionId}'` : 'No interrupted session found to resume.');
    }

    // Restore or create session in sessionStore
    try {
      this.sessionStore.loadSession(checkpoint.sessionId);
    } catch {
      this.sessionStore.createSession(checkpoint.task);
      this.sessionStore.currentSession.id = checkpoint.sessionId;
    }

    this.activeLoop = new AgentLoop({
      provider: this.provider,
      toolRegistry: this.toolRegistry,
      analyzer: this.analyzer,
      planningEngine: this.planning,
      sessionStore: this.sessionStore,
      checkpointManager: this.checkpointManager,
      skillManager: this.skillManager,
      options: {
        maxIterations: this.configManager.get('maxIterations', 25),
        mode: checkpoint.mode || this.mode,
        ...this.callbacks
      }
    });

    try {
      return await this.activeLoop.resume(checkpoint);
    } finally {
      this.activeLoop = null;
    }
  }

  async runAskMode(question) {
    this.callbacks.onStatus('ANALYZING_PROJECT', 'Reading codebase context...');
    const summary = this.analyzer.getArchitectureSummary();

    const prompt = [
      'You are FIXEN CODE in ASK MODE.',
      'Answer the user question accurately based on the project architecture and source code.',
      'Do not modify any files or execute commands in this mode.',
      '',
      summary,
      '',
      `Question: ${question}`
    ].join('\n');

    const res = await this.provider.chat({
      messages: [{ role: 'user', content: prompt }]
    });

    return {
      status: 'SUCCESS',
      mode: 'ask',
      summary: res.content
    };
  }

  async runReviewMode(target = '') {
    this.callbacks.onStatus('REVIEWING', 'Analyzing project for code quality, bugs, and security...');
    const summary = this.analyzer.getArchitectureSummary();

    const prompt = [
      'You are FIXEN CODE in REVIEW MODE.',
      'Perform a thorough code quality, security, and maintainability review for the project.',
      'Highlight:',
      '1. Critical bugs or edge cases.',
      '2. Security vulnerabilities (injection, sensitive file exposure, unvalidated inputs).',
      '3. Performance bottlenecks.',
      '4. Maintainability and architecture recommendations.',
      '',
      summary,
      target ? `Specific target to review: ${target}` : ''
    ].join('\n');

    const res = await this.provider.chat({
      messages: [{ role: 'user', content: prompt }]
    });

    return {
      status: 'SUCCESS',
      mode: 'review',
      summary: res.content
    };
  }
}

module.exports = Orchestrator;
