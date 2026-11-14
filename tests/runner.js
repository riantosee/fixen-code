'use strict';

const fs = require('fs');
const path = require('path');
const colors = require('../src/cli/colors');

async function runAllTests() {
  console.log(colors.bold('\n🧪 FIXEN CODE TEST SUITE\n'));

  const testFiles = [
    'platform.test.js',
    'security.test.js',
    'file-tools.test.js',
    'terminal-tools.test.js',
    'git.test.js',
    'scanner.test.js',
    'groq-provider.test.js',
    'plugin.test.js',
    'session.test.js',
    'agent-loop.test.js',
    'integration.test.js'
  ];

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const file of testFiles) {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) continue;

    process.stdout.write(`  Running ${colors.bold(file)} ... `);
    const testStart = Date.now();

    try {
      const suite = require(fullPath);
      if (typeof suite.run === 'function') {
        await suite.run();
      }
      const duration = Date.now() - testStart;
      console.log(`${colors.green('PASSED')} ${colors.gray(`(${duration}ms)`)}`);
      passed++;
    } catch (err) {
      const duration = Date.now() - testStart;
      console.log(`${colors.red('FAILED')} ${colors.gray(`(${duration}ms)`)}`);
      console.error(colors.red(`    Error: ${err.message}`));
      if (process.env.DEBUG) {
        console.error(err.stack);
      }
      failed++;
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(colors.bold('\n----------------------------------------'));
  console.log(`Results: ${colors.green(`${passed} passed`)}, ${failed > 0 ? colors.red(`${failed} failed`) : '0 failed'}`);
  console.log(`Total duration: ${totalTime}ms\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runAllTests };
