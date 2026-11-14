'use strict';

const path = require('path');
const fs = require('fs');

class PathGuard {
  constructor(workspaceRoot, options = {}) {
    if (!workspaceRoot) {
      throw new Error('Workspace root is required for PathGuard');
    }
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.allowSymlinksOutside = Boolean(options.allowSymlinksOutside);
    this.sensitivePatterns = options.sensitivePatterns || [
      /^\.git([\\/]|$)/i,
      /^\.env(\..+)?$/i,
      /id_rsa/i,
      /\.pem$/i,
      /\.key$/i,
      /credentials\.json$/i,
      /service-account.*\.json$/i,
      /token\.json$/i
    ];
  }

  getWorkspace() {
    return this.workspaceRoot;
  }

  /**
   * Resolves a target path relative to the workspace, validating against path traversal.
   * Throws if the path attempts to escape the workspace.
   */
  resolvePath(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') {
      throw new Error('Invalid path provided');
    }

    // Resolve path relative to workspace
    let resolved;
    if (path.isAbsolute(targetPath)) {
      resolved = path.resolve(targetPath);
    } else {
      resolved = path.resolve(this.workspaceRoot, targetPath);
    }

    // Check boundary
    const relative = path.relative(this.workspaceRoot, resolved);
    const isOutside = relative.startsWith('..') || path.isAbsolute(relative);

    if (isOutside) {
      throw new Error(`Security Violation: Path '${targetPath}' resolves outside workspace boundary (${this.workspaceRoot})`);
    }

    // Check symlink realpath if file exists
    if (!this.allowSymlinksOutside && fs.existsSync(resolved)) {
      try {
        const real = fs.realpathSync(resolved);
        const relReal = path.relative(this.workspaceRoot, real);
        if (relReal.startsWith('..') || path.isAbsolute(relReal)) {
          throw new Error(`Security Violation: Symlink '${targetPath}' points outside workspace boundary (${real})`);
        }
      } catch (err) {
        if (err.message.includes('Security Violation')) {
          throw err;
        }
      }
    }

    return resolved;
  }

  /**
   * Checks if relative or absolute path is classified as a sensitive file.
   */
  isSensitive(targetPath) {
    const rel = path.relative(this.workspaceRoot, this.resolvePath(targetPath));
    const basename = path.basename(rel);

    for (const pattern of this.sensitivePatterns) {
      if (pattern.test(rel) || pattern.test(basename)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get clean relative path for display/logging
   */
  toRelative(targetPath) {
    try {
      const resolved = this.resolvePath(targetPath);
      const rel = path.relative(this.workspaceRoot, resolved);
      return rel || '.';
    } catch {
      return targetPath;
    }
  }
}

module.exports = PathGuard;
