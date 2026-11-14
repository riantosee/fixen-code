'use strict';

const fs = require('fs');
const path = require('path');

class ProjectDetector {
  constructor(workspace) {
    this.workspace = path.resolve(workspace || process.cwd());
  }

  detectLanguages(extensionCounts = {}) {
    const languageMap = {
      '.js': 'JavaScript',
      '.cjs': 'JavaScript',
      '.mjs': 'JavaScript',
      '.jsx': 'JavaScript (React)',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript (React)',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.c': 'C',
      '.cpp': 'C++',
      '.h': 'C/C++ Header',
      '.hpp': 'C++ Header',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.sh': 'Shell',
      '.bash': 'Bash',
      '.ps1': 'PowerShell',
      '.html': 'HTML',
      '.css': 'CSS',
      '.json': 'JSON',
      '.md': 'Markdown'
    };

    const detected = {};
    for (const [ext, count] of Object.entries(extensionCounts)) {
      const lang = languageMap[ext.toLowerCase()];
      if (lang) {
        detected[lang] = (detected[lang] || 0) + count;
      }
    }

    return Object.entries(detected)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => ({ language: lang, files: count }));
  }

  detectFrameworksAndTools() {
    const frameworks = [];
    let packageManager = 'unknown';
    let testRunner = 'unknown';

    // Node.js checks
    const pkgPath = path.join(this.workspace, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const allDeps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {})
        };

        if (allDeps['react']) frameworks.push('React');
        if (allDeps['next']) frameworks.push('Next.js');
        if (allDeps['vue']) frameworks.push('Vue');
        if (allDeps['@angular/core']) frameworks.push('Angular');
        if (allDeps['express']) frameworks.push('Express');
        if (allDeps['fastify']) frameworks.push('Fastify');
        if (allDeps['@nestjs/core']) frameworks.push('NestJS');
        if (allDeps['vite']) frameworks.push('Vite');
        if (allDeps['tailwindcss']) frameworks.push('Tailwind CSS');

        // Test runners
        if (allDeps['jest']) testRunner = 'jest';
        else if (allDeps['vitest']) testRunner = 'vitest';
        else if (allDeps['mocha']) testRunner = 'mocha';
        else if (pkg.scripts && pkg.scripts.test && pkg.scripts.test.includes('--test')) testRunner = 'node:test';
        else if (pkg.scripts && pkg.scripts.test) testRunner = 'npm test';

        // Package managers
        if (fs.existsSync(path.join(this.workspace, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
        else if (fs.existsSync(path.join(this.workspace, 'yarn.lock'))) packageManager = 'yarn';
        else if (fs.existsSync(path.join(this.workspace, 'bun.lockb'))) packageManager = 'bun';
        else packageManager = 'npm';
      } catch {}
    }

    // Python checks
    if (fs.existsSync(path.join(this.workspace, 'requirements.txt')) || fs.existsSync(path.join(this.workspace, 'pyproject.toml'))) {
      if (fs.existsSync(path.join(this.workspace, 'poetry.lock'))) packageManager = 'poetry';
      else packageManager = 'pip';

      let reqContent = '';
      try {
        if (fs.existsSync(path.join(this.workspace, 'requirements.txt'))) {
          reqContent = fs.readFileSync(path.join(this.workspace, 'requirements.txt'), 'utf8');
        }
      } catch {}

      if (reqContent.includes('django')) frameworks.push('Django');
      if (reqContent.includes('flask')) frameworks.push('Flask');
      if (reqContent.includes('fastapi')) frameworks.push('FastAPI');
      if (reqContent.includes('pytest')) testRunner = 'pytest';
    }

    // Rust checks
    if (fs.existsSync(path.join(this.workspace, 'Cargo.toml'))) {
      packageManager = 'cargo';
      testRunner = 'cargo test';
      frameworks.push('Rust / Cargo');
    }

    // Go checks
    if (fs.existsSync(path.join(this.workspace, 'go.mod'))) {
      packageManager = 'go';
      testRunner = 'go test';
      frameworks.push('Go Module');
    }

    return {
      frameworks,
      packageManager,
      testRunner
    };
  }
}

module.exports = ProjectDetector;
