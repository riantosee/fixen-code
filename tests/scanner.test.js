'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ProjectScanner = require('../src/intelligence/project-scanner');
const ProjectDetector = require('../src/intelligence/detector');
const ProjectAnalyzer = require('../src/intelligence/analyzer');

function run() {
  const dummyWorkspace = path.join(os.tmpdir(), 'fixen-scan-test-' + Date.now());
  fs.mkdirSync(path.join(dummyWorkspace, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dummyWorkspace, 'node_modules', 'fake'), { recursive: true });

  fs.writeFileSync(path.join(dummyWorkspace, 'package.json'), JSON.stringify({
    name: 'sample-project',
    dependencies: { express: '^4.18.0' },
    devDependencies: { jest: '^29.0.0' },
    main: 'src/server.js'
  }));

  fs.writeFileSync(path.join(dummyWorkspace, 'src', 'server.js'), 'console.log("running");');
  fs.writeFileSync(path.join(dummyWorkspace, 'node_modules', 'fake', 'index.js'), 'ignored');

  try {
    // 1. Scanner
    const scanner = new ProjectScanner(dummyWorkspace);
    const scanResult = scanner.scan();
    assert.ok(scanResult.totalFiles >= 2);
    // Ensure node_modules was ignored
    const scannedPaths = scanResult.files.map((f) => f.path);
    assert.ok(scannedPaths.includes('src/server.js'));
    assert.ok(!scannedPaths.some((p) => p.includes('node_modules')));

    // 2. Tree generation
    const tree = scanner.generateTree();
    assert.ok(tree.includes('src/'));
    assert.ok(!tree.includes('node_modules'));

    // 3. Detector
    const detector = new ProjectDetector(dummyWorkspace);
    const langs = detector.detectLanguages(scanResult.extensionCounts);
    assert.ok(langs.some((l) => l.language === 'JavaScript'));
    const tools = detector.detectFrameworksAndTools();
    assert.ok(tools.frameworks.includes('Express'));
    assert.strictEqual(tools.testRunner, 'jest');

    // 4. Analyzer
    const analyzer = new ProjectAnalyzer(dummyWorkspace);
    const summary = analyzer.getArchitectureSummary();
    assert.ok(summary.includes('Express'));
    assert.ok(summary.includes('sample-project'));

    return { name: 'scanner.test.js', passed: true };
  } finally {
    try {
      fs.rmSync(dummyWorkspace, { recursive: true, force: true });
    } catch {}
  }
}

module.exports = { run };
