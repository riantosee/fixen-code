'use strict';

class BaseTool {
  constructor(name, description, parameters = {}) {
    if (!name) throw new Error('Tool name is required');
    this.name = name;
    this.description = description || '';
    this.parameters = parameters;
  }

  getSchema() {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters
      }
    };
  }

  async execute(args, context = {}) {
    throw new Error(`execute() not implemented for tool '${this.name}'`);
  }
}

module.exports = BaseTool;
