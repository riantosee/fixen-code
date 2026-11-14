'use strict';

class ToolRegistry {
  constructor(options = {}) {
    this.tools = new Map();
    this.handlers = new Map();
    this.auditLogger = options.auditLogger || null;
  }

  registerTool(tool, handler) {
    if (!tool || !tool.name) {
      throw new Error('Invalid tool provided for registration');
    }
    this.tools.set(tool.name, tool);
    if (handler) {
      this.handlers.set(tool.name, handler);
    } else if (typeof tool.execute === 'function') {
      this.handlers.set(tool.name, tool.execute.bind(tool));
    }
  }

  registerGroup(tools, handlers = {}) {
    for (const tool of tools) {
      const handler = handlers[tool.name];
      this.registerTool(tool, handler);
    }
  }

  hasTool(name) {
    return this.tools.has(name);
  }

  getTool(name) {
    return this.tools.get(name);
  }

  getToolsSchema() {
    return Array.from(this.tools.values()).map((tool) => tool.getSchema());
  }

  async execute(name, args = {}, context = {}) {
    const handler = this.handlers.get(name);
    if (!handler) {
      const errorMsg = `Tool '${name}' not found in registry`;
      if (this.auditLogger) {
        this.auditLogger.log('tool_not_found', { name, args });
      }
      return { success: false, error: errorMsg };
    }

    const startTime = Date.now();
    try {
      const result = await handler(args, context);
      const durationMs = Date.now() - startTime;

      if (this.auditLogger) {
        this.auditLogger.log('tool_executed', { name, args, durationMs, success: true });
      }

      return {
        success: true,
        tool: name,
        result,
        durationMs
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err.message || String(err);

      if (this.auditLogger) {
        this.auditLogger.log('tool_failed', { name, args, error: errorMsg, durationMs, success: false });
      }

      return {
        success: false,
        tool: name,
        error: errorMsg,
        durationMs
      };
    }
  }
}

module.exports = ToolRegistry;
