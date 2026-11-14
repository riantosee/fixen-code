'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor(workspace = process.cwd()) {
    this.workspace = path.resolve(workspace);
    this.globalConfigDir = path.join(os.homedir(), '.fixen');
    this.globalConfigFile = path.join(this.globalConfigDir, 'config.json');
    this.projectConfigDir = path.join(this.workspace, '.fixen');
    this.projectConfigFile = path.join(this.projectConfigDir, 'config.json');

    this.defaultConfig = this.loadDefaultConfig();
    this.config = this.loadMergedConfig();
  }

  loadDefaultConfig() {
    try {
      const defaultPath = path.resolve(__dirname, '../../config/default.json');
      if (fs.existsSync(defaultPath)) {
        return JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
      }
    } catch {
      // Fallback
    }

    return {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      permissionLevel: 4,
      maxIterations: 25,
      toolTimeoutMs: 30000,
      llmTimeoutMs: 60000,
      mode: 'auto',
      providers: {
        groq: {
          endpoint: 'https://api.groq.com/openai/v1',
          defaultModel: 'llama-3.3-70b-versatile',
          apiKeyEnv: 'GROQ_API_KEY'
        }
      }
    };
  }

  loadMergedConfig() {
    let merged = JSON.parse(JSON.stringify(this.defaultConfig));

    // Global config
    if (fs.existsSync(this.globalConfigFile)) {
      try {
        const globalData = JSON.parse(fs.readFileSync(this.globalConfigFile, 'utf8'));
        merged = this.deepMerge(merged, globalData);
      } catch {}
    }

    // Project config
    if (fs.existsSync(this.projectConfigFile)) {
      try {
        const projectData = JSON.parse(fs.readFileSync(this.projectConfigFile, 'utf8'));
        merged = this.deepMerge(merged, projectData);
      } catch {}
    }

    // Environment overrides
    if (process.env.FIXEN_PROVIDER) merged.provider = process.env.FIXEN_PROVIDER;
    if (process.env.FIXEN_MODEL) merged.model = process.env.FIXEN_MODEL;
    if (process.env.FIXEN_PERMISSION_LEVEL) {
      const parsed = parseInt(process.env.FIXEN_PERMISSION_LEVEL, 10);
      if (!isNaN(parsed)) merged.permissionLevel = parsed;
    }

    return merged;
  }

  deepMerge(target, source) {
    const output = { ...target };
    if (source && typeof source === 'object') {
      for (const [key, value] of Object.entries(source)) {
        if (value && typeof value === 'object' && !Array.isArray(value) && target[key]) {
          output[key] = this.deepMerge(target[key], value);
        } else {
          output[key] = value;
        }
      }
    }
    return output;
  }

  get(keyPath, defaultValue = undefined) {
    if (!keyPath) return this.config;
    const parts = keyPath.split('.');
    let current = this.config;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return defaultValue;
      }
    }
    return current;
  }

  setGlobal(keyPath, value) {
    if (!fs.existsSync(this.globalConfigDir)) {
      fs.mkdirSync(this.globalConfigDir, { recursive: true });
    }
    let globalData = {};
    if (fs.existsSync(this.globalConfigFile)) {
      try {
        globalData = JSON.parse(fs.readFileSync(this.globalConfigFile, 'utf8'));
      } catch {}
    }

    this.setInObject(globalData, keyPath, value);
    fs.writeFileSync(this.globalConfigFile, JSON.stringify(globalData, null, 2), 'utf8');
    this.config = this.loadMergedConfig();
    return true;
  }

  setProject(keyPath, value) {
    if (!fs.existsSync(this.projectConfigDir)) {
      fs.mkdirSync(this.projectConfigDir, { recursive: true });
    }
    let projectData = {};
    if (fs.existsSync(this.projectConfigFile)) {
      try {
        projectData = JSON.parse(fs.readFileSync(this.projectConfigFile, 'utf8'));
      } catch {}
    }

    this.setInObject(projectData, keyPath, value);
    fs.writeFileSync(this.projectConfigFile, JSON.stringify(projectData, null, 2), 'utf8');
    this.config = this.loadMergedConfig();
    return true;
  }

  setInObject(obj, keyPath, value) {
    const parts = keyPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!current[p] || typeof current[p] !== 'object') {
        current[p] = {};
      }
      current = current[p];
    }
    current[parts[parts.length - 1]] = value;
  }

  initProject() {
    if (!fs.existsSync(this.projectConfigDir)) {
      fs.mkdirSync(this.projectConfigDir, { recursive: true });
    }
    const initial = {
      provider: this.config.provider || 'groq',
      model: this.config.model || 'llama-3.3-70b-versatile',
      permissionLevel: this.config.permissionLevel || 4,
      initializedAt: new Date().toISOString()
    };
    fs.writeFileSync(this.projectConfigFile, JSON.stringify(initial, null, 2), 'utf8');
    return this.projectConfigFile;
  }

  getApiKey(providerName) {
    const provider = providerName || this.config.provider;
    const providerCfg = this.config.providers && this.config.providers[provider];

    if (providerCfg && providerCfg.apiKeyEnv) {
      if (process.env[providerCfg.apiKeyEnv]) {
        return process.env[providerCfg.apiKeyEnv];
      }
    }

    // Check direct config
    if (providerCfg && providerCfg.apiKey) {
      return providerCfg.apiKey;
    }

    // Common env fallbacks
    if (provider === 'groq' && process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
    if (provider === 'openai' && process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
    if (provider === 'gemini' && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
      return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    }

    return null;
  }
}

module.exports = ConfigManager;
