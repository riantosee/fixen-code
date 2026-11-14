'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const AgentLoop = require('../src/core/agent-loop');
const ToolRegistry = require('../src/tools/tool-registry');
const FileTools = require('../src/tools/file-tools');
const PathGuard = require('../src/security/path-guard');
const { PermissionManager, PERMISSION_LEVELS } = require('../src/security/permissions');
const ProjectAnalyzer = require('../src/intelligence/analyzer');
const PlanningEngine = require('../src/core/planning');
const SessionStore = require('../src/memory/session-store');

async function run() {
  const dummyWorkspace = path.join(os.tmpdir(), 'fixen-loop-test-' + Date.now());
  fs.mkdirSync(dummyWorkspace, { recursive: true });

  try {
    const pathGuard = new PathGuard(dummyWorkspace);
    const pm = new PermissionManager(PERMISSION_LEVELS.FULL_AUTO);
    const fileTools = new FileTools(pathGuard, pm);
    const toolRegistry = new ToolRegistry();

    for (const tool of fileTools.getTools()) {
      const handlerName = `handle${tool.name.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
      const handler = fileTools[handlerName] ? fileTools[handlerName].bind(fileTools) : null;
      toolRegistry.registerTool(tool, handler);
    }

    const analyzer = new ProjectAnalyzer(dummyWorkspace);
    const sessionStore = new SessionStore(dummyWorkspace);

    // Mock Provider that returns scripted tool calls
    let callStep = 0;
    const mockProvider = {
      chat: async ({ messages }) => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && typeof lastMsg.content === 'string' && lastMsg.content.includes('Planning Engine')) {
          return {
            content: JSON.stringify({
              objective: 'Create test.txt',
              steps: [
                { id: 1, action: 'write', description: 'Write test.txt', files: ['test.txt'], verification: 'Inspect file' }
              ]
            })
          };
        }

        callStep++;
        if (callStep === 1) {
          // Tool call: write_file
          return {
            content: 'I will write the test file.',
            toolCalls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'write_file',
                  arguments: JSON.stringify({
                    path: 'test.txt',
                    content: 'Fixen autonomous test'
                  })
                }
              }
            ]
          };
        } else if (callStep === 2) {
          // Tool call: inspect_file
          return {
            content: 'I will inspect the created file.',
            toolCalls: [
              {
                id: 'call_2',
                type: 'function',
                function: {
                  name: 'inspect_file',
                  arguments: JSON.stringify({ path: 'test.txt' })
                }
              }
            ]
          };
        } else {
          // Finished
          return {
            content: 'I have successfully created and verified test.txt.',
            toolCalls: null
          };
        }
      }
    };

    const planning = new PlanningEngine(mockProvider);

    const loop = new AgentLoop({
      provider: mockProvider,
      toolRegistry,
      analyzer,
      planningEngine: planning,
      sessionStore,
      options: { maxIterations: 10 }
    });

    const result = await loop.run('Create test.txt and verify it');

    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.modifiedFiles.includes('test.txt'));
    assert.ok(fs.existsSync(path.join(dummyWorkspace, 'test.txt')));
    assert.strictEqual(fs.readFileSync(path.join(dummyWorkspace, 'test.txt'), 'utf8'), 'Fixen autonomous test');

    // Test loop detection
    const loopDetector = new AgentLoop({
      provider: mockProvider,
      toolRegistry,
      analyzer,
      planningEngine: planning,
      sessionStore
    });

    assert.strictEqual(loopDetector.isLooping('read_file', { path: 'a.js' }), false);
    assert.strictEqual(loopDetector.isLooping('read_file', { path: 'a.js' }), false);
    assert.strictEqual(loopDetector.isLooping('read_file', { path: 'a.js' }), true, 'Third identical call must trigger loop detection');

    return { name: 'agent-loop.test.js', passed: true };
  } finally {
    try {
      fs.rmSync(dummyWorkspace, { recursive: true, force: true });
    } catch {}
  }
}

module.exports = { run };
