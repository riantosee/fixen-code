'use strict';

const assert = require('assert');
const PluginManager = require('../src/plugins/plugin-manager');
const ToolRegistry = require('../src/tools/tool-registry');

async function run() {
  const registry = new ToolRegistry();
  const pm = new PluginManager(process.cwd(), registry);

  pm.registerPlugin({
    name: 'custom_calc',
    description: 'Add two numbers',
    parameters: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' }
      }
    },
    handler: async (args) => {
      return { sum: (args.a || 0) + (args.b || 0) };
    }
  });

  assert.strictEqual(registry.hasTool('custom_calc'), true);
  const res = await registry.execute('custom_calc', { a: 15, b: 27 });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.result.sum, 42);

  return { name: 'plugin.test.js', passed: true };
}

module.exports = { run };
