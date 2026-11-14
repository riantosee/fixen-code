'use strict';

const Orchestrator = require('./core/orchestrator');
const AgentLoop = require('./core/agent-loop');
const PlanningEngine = require('./core/planning');
const ReasoningEngine = require('./core/reasoning');
const ContextManager = require('./core/context');
const ConfigManager = require('./config/config-manager');
const ProviderFactory = require('./providers/provider-factory');
const GroqProvider = require('./providers/groq-provider');
const OpenAIProvider = require('./providers/openai-provider');
const GeminiProvider = require('./providers/gemini-provider');
const OllamaProvider = require('./providers/ollama-provider');
const ToolRegistry = require('./tools/tool-registry');
const FileTools = require('./tools/file-tools');
const TerminalTools = require('./tools/terminal-tools');
const GitTools = require('./tools/git-tools');
const ProjectScanner = require('./intelligence/project-scanner');
const ProjectDetector = require('./intelligence/detector');
const ProjectAnalyzer = require('./intelligence/analyzer');
const PathGuard = require('./security/path-guard');
const { PermissionManager, PERMISSION_LEVELS } = require('./security/permissions');
const { maskSecrets } = require('./security/secret-guard');
const SessionStore = require('./memory/session-store');
const CheckpointManager = require('./memory/checkpoint-manager');
const SkillManager = require('./skills/skill-manager');
const { getPlatformInfo } = require('./terminal/platform');
const { createDiff } = require('./utils/diff');

module.exports = {
  Orchestrator,
  AgentLoop,
  PlanningEngine,
  ReasoningEngine,
  ContextManager,
  ConfigManager,
  ProviderFactory,
  GroqProvider,
  OpenAIProvider,
  GeminiProvider,
  OllamaProvider,
  ToolRegistry,
  FileTools,
  TerminalTools,
  GitTools,
  ProjectScanner,
  ProjectDetector,
  ProjectAnalyzer,
  PathGuard,
  PermissionManager,
  PERMISSION_LEVELS,
  maskSecrets,
  SessionStore,
  CheckpointManager,
  SkillManager,
  getPlatformInfo,
  createDiff
};
