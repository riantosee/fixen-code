'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_IGNORES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  'vendor',
  '.cache',
  '.fixen',
  '.idea',
  '.vscode',
  'coverage',
  '.DS_Store'
];

class ProjectScanner {
  constructor(workspaceRoot, options = {}) {
    this.workspace = path.resolve(workspaceRoot || process.cwd());
    this.customIgnores = options.ignorePatterns || [];
    this.gitIgnorePatterns = this.loadGitIgnore();
  }

  loadGitIgnore() {
    const gitignorePath = path.join(this.workspace, '.gitignore');
    if (!fs.existsSync(gitignorePath)) return [];
    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      return content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .map((p) => p.replace(/^\//, '').replace(/\/$/, ''));
    } catch {
      return [];
    }
  }

  shouldIgnore(name, relPath) {
    if (DEFAULT_IGNORES.includes(name)) return true;
    if (this.customIgnores.includes(name)) return true;

    for (const pattern of this.gitIgnorePatterns) {
      if (name === pattern || relPath === pattern || relPath.startsWith(pattern + '/')) {
        return true;
      }
    }
    return false;
  }

  scan(options = {}) {
    const maxDepth = options.maxDepth || 6;
    const maxFiles = options.maxFiles || 2000;
    const files = [];
    const directories = [];
    const extensionCounts = {};
    let totalSizeBytes = 0;

    const walk = (currentDir, depth) => {
      if (depth > maxDepth || files.length >= maxFiles) return;

      let entries;
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(this.workspace, fullPath).replace(/\\/g, '/');

        if (this.shouldIgnore(entry.name, relPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          directories.push(relPath);
          walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          let size = 0;
          try {
            const stat = fs.statSync(fullPath);
            size = stat.size;
            totalSizeBytes += size;
          } catch {}

          const ext = path.extname(entry.name).toLowerCase() || '[no_ext]';
          extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;

          files.push({
            name: entry.name,
            path: relPath,
            ext,
            size
          });
        }
      }
    };

    walk(this.workspace, 1);

    return {
      workspace: this.workspace,
      totalFiles: files.length,
      totalDirectories: directories.length,
      totalSizeBytes,
      extensionCounts,
      files,
      directories
    };
  }

  generateTree(maxDepth = 3) {
    const lines = [path.basename(this.workspace) + '/'];

    const buildTree = (dir, prefix, depth) => {
      if (depth > maxDepth) return;
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      const filtered = entries.filter((entry) => {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(this.workspace, fullPath).replace(/\\/g, '/');
        return !this.shouldIgnore(entry.name, relPath);
      });

      filtered.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (let i = 0; i < filtered.length; i++) {
        const entry = filtered[i];
        const isLast = i === filtered.length - 1;
        const branch = isLast ? '└── ' : '├── ';
        const childPrefix = prefix + (isLast ? '    ' : '│   ');

        lines.push(`${prefix}${branch}${entry.name}${entry.isDirectory() ? '/' : ''}`);

        if (entry.isDirectory()) {
          buildTree(path.join(dir, entry.name), childPrefix, depth + 1);
        }
      }
    };

    buildTree(this.workspace, '', 1);
    return lines.join('\n');
  }
}

module.exports = ProjectScanner;
