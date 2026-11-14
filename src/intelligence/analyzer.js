'use strict';

const fs = require('fs');
const path = require('path');
const ProjectScanner = require('./project-scanner');
const ProjectDetector = require('./detector');

class ProjectAnalyzer {
  constructor(workspace = process.cwd()) {
    this.workspace = path.resolve(workspace);
    this.scanner = new ProjectScanner(this.workspace);
    this.detector = new ProjectDetector(this.workspace);
  }

  detectEntrypoints() {
    const candidates = [
      'bin/fixen.js',
      'src/index.js',
      'src/main.js',
      'index.js',
      'main.js',
      'app.js',
      'server.js',
      'src/index.ts',
      'src/main.ts',
      'main.py',
      'app.py',
      'src/main.rs',
      'src/lib.rs',
      'main.go'
    ];

    const found = [];
    const pkgPath = path.join(this.workspace, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.main && fs.existsSync(path.join(this.workspace, pkg.main))) {
          found.push({ type: 'package.main', path: pkg.main });
        }
        if (pkg.bin) {
          if (typeof pkg.bin === 'string') {
            found.push({ type: 'package.bin', path: pkg.bin });
          } else if (typeof pkg.bin === 'object') {
            for (const [binName, binFile] of Object.entries(pkg.bin)) {
              found.push({ type: `bin:${binName}`, path: binFile });
            }
          }
        }
      } catch {}
    }

    for (const rel of candidates) {
      if (fs.existsSync(path.join(this.workspace, rel))) {
        if (!found.some((f) => f.path === rel)) {
          found.push({ type: 'file', path: rel });
        }
      }
    }

    return found;
  }

  getProjectName() {
    const pkgPath = path.join(this.workspace, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name) return pkg.name;
      } catch {}
    }
    return path.basename(this.workspace);
  }

  analyze() {
    const scanResult = this.scanner.scan({ maxDepth: 4 });
    const languages = this.detector.detectLanguages(scanResult.extensionCounts);
    const tooling = this.detector.detectFrameworksAndTools();
    const entrypoints = this.detectEntrypoints();
    const tree = this.scanner.generateTree(3);

    return {
      workspace: this.workspace,
      projectName: this.getProjectName(),
      scan: scanResult,
      languages,
      tooling,
      entrypoints,
      tree
    };
  }

  getArchitectureSummary() {
    const data = this.analyze();
    const topLangs = data.languages.slice(0, 3).map((l) => `${l.language} (${l.files} files)`).join(', ') || 'None detected';
    const frameworks = data.tooling.frameworks.join(', ') || 'Standard / Vanilla';
    const entrypoints = data.entrypoints.map((e) => `${e.path} (${e.type})`).join(', ') || 'Not detected';

    return [
      `### Project Architecture: ${data.projectName}`,
      `- **Path**: \`${data.workspace}\``,
      `- **Primary Languages**: ${topLangs}`,
      `- **Frameworks**: ${frameworks}`,
      `- **Package Manager**: ${data.tooling.packageManager}`,
      `- **Test Runner**: ${data.tooling.testRunner}`,
      `- **Entrypoints**: ${entrypoints}`,
      `- **Files Scanned**: ${data.scan.totalFiles} files in ${data.scan.totalDirectories} directories`,
      '',
      '#### File Structure:',
      '```',
      data.tree,
      '```'
    ].join('\n');
  }
}

module.exports = ProjectAnalyzer;
