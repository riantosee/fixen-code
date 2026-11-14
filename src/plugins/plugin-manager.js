'use strict';

const path = require('path');
const fs = require('fs');
const BaseTool = require('../tools/base-tool');

class PluginManager {
  constructor(workspace = process.cwd(), toolRegistry = null) {
    this.workspace = path.resolve(workspace);
    this.pluginsDir = path.join(this.workspace, 'plugins');
    this.toolRegistry = toolRegistry;
    this.plugins = new Map();
  }

  registerPlugin(pluginDefinition) {
    const {
      name,
      description,
      parameters,
      handler,
      permissions = 'ask',
      timeoutMs = 30000
    } = pluginDefinition;

    if (!name || typeof name !== 'string') {
      throw new Error('Plugin requires a valid name');
    }
    if (typeof handler !== 'function') {
      throw new Error(`Plugin '${name}' requires a function handler`);
    }

    const pluginRecord = {
      name,
      description: description || '',
      parameters: parameters || { type: 'object', properties: {} },
      handler,
      permissions,
      timeoutMs,
      registeredAt: new Date().toISOString()
    };

    this.plugins.set(name, pluginRecord);

    if (this.toolRegistry) {
      const tool = new BaseTool(name, description, pluginRecord.parameters);
      this.toolRegistry.registerTool(tool, async (args, context) => {
        // Enforce plugin execution timeout
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Plugin '${name}' timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        try {
          const result = await Promise.race([
            handler(args, { ...context, workspace: this.workspace }),
            timeoutPromise
          ]);
          clearTimeout(timer);
          return result;
        } catch (err) {
          clearTimeout(timer);
          throw err;
        }
      });
    }

    return pluginRecord;
  }

  loadFromDirectory(dirPath = null) {
    const targetDir = dirPath || this.pluginsDir;
    if (!fs.existsSync(targetDir)) return [];

    const files = fs.readdirSync(targetDir);
    const loaded = [];

    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.json')) {
        const fullPath = path.join(targetDir, file);
        try {
          const def = require(fullPath);
          if (def && def.name && typeof def.handler === 'function') {
            this.registerPlugin(def);
            loaded.push(def.name);
          }
        } catch {}
      }
    }

    return loaded;
  }

  listPlugins() {
    return Array.from(this.plugins.values()).map((p) => ({
      name: p.name,
      description: p.description,
      permissions: p.permissions,
      timeoutMs: p.timeoutMs
    }));
  }
}

module.exports = PluginManager;
