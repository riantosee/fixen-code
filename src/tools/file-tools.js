'use strict';

const fs = require('fs');
const path = require('path');
const BaseTool = require('./base-tool');
const { createDiff } = require('../utils/diff');

class FileTools {
  constructor(pathGuard, permissionManager, options = {}) {
    this.pathGuard = pathGuard;
    this.permissions = permissionManager;
    this.workspace = pathGuard.getWorkspace();
    this.backupDir = path.join(this.workspace, '.fixen', 'backups');
    this.diffCallback = options.onDiffPreview || null;
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  backupFile(resolvedPath) {
    if (!fs.existsSync(resolvedPath)) return null;
    this.ensureBackupDir();
    const rel = path.relative(this.workspace, resolvedPath).replace(/[\/\\]/g, '_');
    const backupName = `${Date.now()}_${rel}`;
    const backupPath = path.join(this.backupDir, backupName);
    fs.copyFileSync(resolvedPath, backupPath);
    return backupPath;
  }

  getTools() {
    return [
      this.createListFilesTool(),
      this.createReadFileTool(),
      this.createWriteFileTool(),
      this.createEditFileTool(),
      this.createDeleteFileTool(),
      this.createCreateDirectoryTool(),
      this.createSearchFilesTool(),
      this.createReplaceTextTool(),
      this.createMoveFileTool(),
      this.createInspectFileTool()
    ];
  }

  createListFilesTool() {
    return new BaseTool(
      'list_files',
      'List files and directories within a given directory inside the workspace.',
      {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to directory to list. Defaults to root of workspace.'
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to list recursively. Defaults to false.'
          },
          maxDepth: {
            type: 'integer',
            description: 'Max recursion depth (default: 3).'
          }
        }
      }
    );
  }

  createReadFileTool() {
    return new BaseTool(
      'read_file',
      'Read the contents of a file within the workspace. Returns line-numbered text.',
      {
        type: 'object',
        required: ['path'],
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to file.'
          },
          startLine: {
            type: 'integer',
            description: '1-based starting line number (optional).'
          },
          endLine: {
            type: 'integer',
            description: '1-based ending line number (optional).'
          }
        }
      }
    );
  }

  createWriteFileTool() {
    return new BaseTool(
      'write_file',
      'Write full content to a file. Creates file and parent directories if they do not exist. Backs up existing file before overwrite.',
      {
        type: 'object',
        required: ['path', 'content'],
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to destination file.'
          },
          content: {
            type: 'string',
            description: 'Full text content to write.'
          },
          overwrite: {
            type: 'boolean',
            description: 'Allow overwriting existing file. Default true.'
          }
        }
      }
    );
  }

  createEditFileTool() {
    return new BaseTool(
      'edit_file',
      'Edit an existing file by replacing a unique exact target string with a replacement string.',
      {
        type: 'object',
        required: ['path', 'target', 'replacement'],
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to file to edit.'
          },
          target: {
            type: 'string',
            description: 'The exact string sequence to replace (must match existing file content).'
          },
          replacement: {
            type: 'string',
            description: 'The new string to replace the target with.'
          }
        }
      }
    );
  }

  createDeleteFileTool() {
    return new BaseTool(
      'delete_file',
      'Delete a file or empty directory inside the workspace. Automatically creates a backup first.',
      {
        type: 'object',
        required: ['path'],
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to file or directory.'
          }
        }
      }
    );
  }

  createCreateDirectoryTool() {
    return new BaseTool(
      'create_directory',
      'Create a new directory (and any necessary parent directories) inside the workspace.',
      {
        type: 'object',
        required: ['path'],
        properties: {
          path: {
            type: 'string',
            description: 'Relative directory path to create.'
          }
        }
      }
    );
  }

  createSearchFilesTool() {
    return new BaseTool(
      'search_files',
      'Search for text or regex pattern across workspace files.',
      {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description: 'Search string or regex pattern.'
          },
          path: {
            type: 'string',
            description: 'Subdirectory to search in (optional).'
          },
          isRegex: {
            type: 'boolean',
            description: 'Whether query is a regex. Default false.'
          },
          filePattern: {
            type: 'string',
            description: 'Filter files by extension or pattern (e.g. ".js" or ".json").'
          }
        }
      }
    );
  }

  createReplaceTextTool() {
    return new BaseTool(
      'replace_text',
      'Find and replace text or regex pattern in a file.',
      {
        type: 'object',
        required: ['path', 'search', 'replace'],
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to file.'
          },
          search: {
            type: 'string',
            description: 'String or regex to search for.'
          },
          replace: {
            type: 'string',
            description: 'Replacement string.'
          },
          isRegex: {
            type: 'boolean',
            description: 'Treat search as regex. Default false.'
          }
        }
      }
    );
  }

  createMoveFileTool() {
    return new BaseTool(
      'move_file',
      'Move or rename a file or directory within the workspace.',
      {
        type: 'object',
        required: ['source', 'destination'],
        properties: {
          source: {
            type: 'string',
            description: 'Source relative path.'
          },
          destination: {
            type: 'string',
            description: 'Destination relative path.'
          }
        }
      }
    );
  }

  createInspectFileTool() {
    return new BaseTool(
      'inspect_file',
      'Inspect metadata of a file or directory (size, line count, permissions, modified time).',
      {
        type: 'object',
        required: ['path'],
        properties: {
          path: {
            type: 'string',
            description: 'Relative path.'
          }
        }
      }
    );
  }

  // Execution Handlers
  async handleListFiles(args = {}) {
    const targetDir = this.pathGuard.resolvePath(args.path || '.');
    if (!fs.existsSync(targetDir)) {
      throw new Error(`Directory not found: ${args.path || '.'}`);
    }

    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${args.path}`);
    }

    const recursive = Boolean(args.recursive);
    const maxDepth = args.maxDepth || 3;
    const results = [];

    const scan = (dir, depth) => {
      if (depth > maxDepth) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.fixen') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(this.workspace, fullPath);

        results.push({
          name: entry.name,
          path: relPath.replace(/\\/g, '/'),
          type: entry.isDirectory() ? 'directory' : 'file'
        });

        if (recursive && entry.isDirectory()) {
          scan(fullPath, depth + 1);
        }
      }
    };

    scan(targetDir, 1);
    return { count: results.length, entries: results };
  }

  async handleReadFile(args) {
    const filePath = this.pathGuard.resolvePath(args.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${args.path}`);
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      throw new Error(`Path is a directory, not a file: ${args.path}`);
    }

    if (stat.size > 2 * 1024 * 1024) {
      throw new Error(`File is too large to read into context (${stat.size} bytes). Max is 2MB.`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const totalLines = lines.length;

    let start = 1;
    let end = totalLines;

    if (args.startLine && args.startLine > 0) start = Math.max(1, args.startLine);
    if (args.endLine && args.endLine >= start) end = Math.min(totalLines, args.endLine);

    const selectedLines = lines.slice(start - 1, end);
    const numbered = selectedLines.map((line, idx) => `${start + idx} | ${line}`).join('\n');

    return {
      path: this.pathGuard.toRelative(filePath),
      totalLines,
      startLine: start,
      endLine: end,
      content: numbered,
      rawContent: selectedLines.join('\n')
    };
  }

  async handleWriteFile(args) {
    const filePath = this.pathGuard.resolvePath(args.path);
    const isSensitive = this.pathGuard.isSensitive(filePath);
    const exists = fs.existsSync(filePath);

    if (exists && args.overwrite === false) {
      throw new Error(`File already exists and overwrite is disabled: ${args.path}`);
    }

    // Permission check
    const shouldPrompt = this.permissions.shouldPromptForFile('write', args.path, isSensitive);
    let oldContent = '';
    if (exists) {
      oldContent = fs.readFileSync(filePath, 'utf8');
    }

    const diff = createDiff(oldContent, args.content, args.path);

    if (shouldPrompt && this.diffCallback) {
      const approved = await this.diffCallback({
        operation: exists ? 'update' : 'create',
        path: args.path,
        diff,
        isSensitive
      });
      if (!approved) {
        throw new Error(`User rejected write to '${args.path}'`);
      }
    }

    // Backup before overwrite
    let backupPath = null;
    if (exists) {
      backupPath = this.backupFile(filePath);
    }

    // Ensure parent directory
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Atomic write via temp file
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, args.content, 'utf8');
    fs.renameSync(tempFile, filePath);

    return {
      success: true,
      action: exists ? 'updated' : 'created',
      path: this.pathGuard.toRelative(filePath),
      bytesWritten: Buffer.byteLength(args.content, 'utf8'),
      backup: backupPath ? path.relative(this.workspace, backupPath) : null,
      diff: exists ? diff : null
    };
  }

  async handleEditFile(args) {
    const filePath = this.pathGuard.resolvePath(args.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${args.path}`);
    }

    const isSensitive = this.pathGuard.isSensitive(filePath);
    const shouldPrompt = this.permissions.shouldPromptForFile('edit', args.path, isSensitive);

    const oldContent = fs.readFileSync(filePath, 'utf8');

    // Exact match target
    if (!oldContent.includes(args.target)) {
      throw new Error(`Target text sequence not found in '${args.path}'. Verify exact whitespace, indentation, and characters.`);
    }

    // Count occurrences
    const occurrences = oldContent.split(args.target).length - 1;
    if (occurrences > 1) {
      throw new Error(`Target text occurs ${occurrences} times in '${args.path}'. Specify a more unique target sequence.`);
    }

    const newContent = oldContent.replace(args.target, args.replacement);
    const diff = createDiff(oldContent, newContent, args.path);

    if (shouldPrompt && this.diffCallback) {
      const approved = await this.diffCallback({
        operation: 'edit',
        path: args.path,
        diff,
        isSensitive
      });
      if (!approved) {
        throw new Error(`User rejected edit to '${args.path}'`);
      }
    }

    const backupPath = this.backupFile(filePath);

    // Atomic write
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, newContent, 'utf8');
    fs.renameSync(tempFile, filePath);

    return {
      success: true,
      path: this.pathGuard.toRelative(filePath),
      backup: backupPath ? path.relative(this.workspace, backupPath) : null,
      diff
    };
  }

  async handleDeleteFile(args) {
    const targetPath = this.pathGuard.resolvePath(args.path);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Path does not exist: ${args.path}`);
    }

    const isSensitive = this.pathGuard.isSensitive(targetPath);
    const shouldPrompt = this.permissions.shouldPromptForFile('delete', args.path, isSensitive);

    if (shouldPrompt && this.diffCallback) {
      const approved = await this.diffCallback({
        operation: 'delete',
        path: args.path,
        isSensitive
      });
      if (!approved) {
        throw new Error(`User rejected deletion of '${args.path}'`);
      }
    }

    let backupPath = null;
    const stat = fs.statSync(targetPath);

    if (stat.isFile()) {
      backupPath = this.backupFile(targetPath);
      fs.unlinkSync(targetPath);
    } else if (stat.isDirectory()) {
      fs.rmdirSync(targetPath);
    }

    return {
      success: true,
      path: this.pathGuard.toRelative(targetPath),
      backup: backupPath ? path.relative(this.workspace, backupPath) : null
    };
  }

  async handleCreateDirectory(args) {
    const dirPath = this.pathGuard.resolvePath(args.path);
    if (fs.existsSync(dirPath)) {
      return { success: true, message: `Directory already exists: ${args.path}`, path: args.path };
    }

    fs.mkdirSync(dirPath, { recursive: true });
    return { success: true, path: this.pathGuard.toRelative(dirPath) };
  }

  async handleSearchFiles(args) {
    const root = this.pathGuard.resolvePath(args.path || '.');
    const isRegex = Boolean(args.isRegex);
    let pattern;

    try {
      pattern = isRegex ? new RegExp(args.query, 'i') : null;
    } catch (err) {
      throw new Error(`Invalid regular expression: ${err.message}`);
    }

    const query = args.query;
    const fileFilter = args.filePattern ? args.filePattern.toLowerCase() : null;
    const matches = [];

    const searchDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.fixen') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.isFile()) {
          if (fileFilter && !entry.name.toLowerCase().includes(fileFilter)) {
            continue;
          }

          try {
            const stat = fs.statSync(fullPath);
            if (stat.size > 1024 * 1024) continue; // Skip huge files

            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split(/\r?\n/);

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const hit = isRegex ? pattern.test(line) : line.includes(query);
              if (hit) {
                matches.push({
                  file: path.relative(this.workspace, fullPath).replace(/\\/g, '/'),
                  line: i + 1,
                  text: line.trim().slice(0, 200)
                });
                if (matches.length >= 100) return; // Limit search results
              }
            }
          } catch {}
        }
      }
    };

    searchDir(root);
    return { query: args.query, totalMatches: matches.length, matches };
  }

  async handleReplaceText(args) {
    const filePath = this.pathGuard.resolvePath(args.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${args.path}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let newContent;

    if (args.isRegex) {
      const re = new RegExp(args.search, 'g');
      newContent = content.replace(re, args.replace);
    } else {
      newContent = content.split(args.search).join(args.replace);
    }

    if (newContent === content) {
      return { modified: false, message: 'Search term was not found in file.' };
    }

    return this.handleWriteFile({ path: args.path, content: newContent, overwrite: true });
  }

  async handleMoveFile(args) {
    const src = this.pathGuard.resolvePath(args.source);
    const dest = this.pathGuard.resolvePath(args.destination);

    if (!fs.existsSync(src)) {
      throw new Error(`Source not found: ${args.source}`);
    }

    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.renameSync(src, dest);
    return {
      success: true,
      source: this.pathGuard.toRelative(src),
      destination: this.pathGuard.toRelative(dest)
    };
  }

  async handleInspectFile(args) {
    const target = this.pathGuard.resolvePath(args.path);
    if (!fs.existsSync(target)) {
      throw new Error(`Path not found: ${args.path}`);
    }

    const stat = fs.statSync(target);
    const isDir = stat.isDirectory();
    let lineCount = 0;

    if (!isDir && stat.size < 5 * 1024 * 1024) {
      try {
        const text = fs.readFileSync(target, 'utf8');
        lineCount = text.split(/\r?\n/).length;
      } catch {}
    }

    return {
      path: this.pathGuard.toRelative(target),
      type: isDir ? 'directory' : 'file',
      sizeBytes: stat.size,
      lines: lineCount,
      modified: stat.mtime.toISOString(),
      isSensitive: this.pathGuard.isSensitive(target)
    };
  }
}

module.exports = FileTools;
