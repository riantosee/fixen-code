'use strict';

const PERMISSION_LEVELS = {
  READ_ONLY: 1,
  ASK_BEFORE_CHANGES: 2,
  ASK_BEFORE_COMMANDS: 3,
  CONTROLLED_AUTO: 4,
  FULL_AUTO: 5
};

const PERMISSION_NAMES = {
  1: 'Read Only',
  2: 'Ask Before Changes',
  3: 'Ask Before Commands',
  4: 'Controlled Auto',
  5: 'Full Auto (Unrestricted Workspace)'
};

class PermissionManager {
  constructor(level = PERMISSION_LEVELS.CONTROLLED_AUTO, options = {}) {
    this.level = this.parseLevel(level);
    this.interactivePrompt = options.promptHandler || null;
    this.requireApprovalForSensitiveFiles = options.requireApprovalForSensitiveFiles !== false;
  }

  parseLevel(val) {
    if (typeof val === 'number' && val >= 1 && val <= 5) return val;
    if (typeof val === 'string') {
      const lower = val.toLowerCase().replace(/[-_]/g, '');
      if (lower.includes('read')) return PERMISSION_LEVELS.READ_ONLY;
      if (lower.includes('changes') || lower === 'askchanges') return PERMISSION_LEVELS.ASK_BEFORE_CHANGES;
      if (lower.includes('command') || lower === 'askcommands') return PERMISSION_LEVELS.ASK_BEFORE_COMMANDS;
      if (lower.includes('controlled') || lower === 'auto') return PERMISSION_LEVELS.CONTROLLED_AUTO;
      if (lower.includes('full')) return PERMISSION_LEVELS.FULL_AUTO;
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 1 && num <= 5) return num;
    }
    return PERMISSION_LEVELS.CONTROLLED_AUTO;
  }

  setLevel(level) {
    this.level = this.parseLevel(level);
  }

  getLevel() {
    return this.level;
  }

  getLevelName() {
    return PERMISSION_NAMES[this.level] || 'Unknown';
  }

  canRead() {
    return true; // All levels can read
  }

  canWriteFiles() {
    return this.level >= PERMISSION_LEVELS.ASK_BEFORE_CHANGES;
  }

  canExecuteCommands() {
    return this.level >= PERMISSION_LEVELS.ASK_BEFORE_COMMANDS;
  }

  /**
   * Check if a specific file operation needs interactive user confirmation
   */
  shouldPromptForFile(operation, filePath, isSensitive = false) {
    if (this.level === PERMISSION_LEVELS.READ_ONLY) {
      if (operation !== 'read') {
        throw new Error(`Permission denied: Cannot perform '${operation}' on '${filePath}' in Read-Only mode.`);
      }
      return false;
    }

    if (this.level === PERMISSION_LEVELS.ASK_BEFORE_CHANGES) {
      return operation !== 'read';
    }

    if (isSensitive) {
      return true; // Always prompt for sensitive files unless Full Auto
    }

    if (this.level === PERMISSION_LEVELS.FULL_AUTO) {
      return false;
    }

    // CONTROLLED_AUTO or ASK_BEFORE_COMMANDS
    if (operation === 'delete') {
      return true; // Always confirm deletions in Controlled Auto
    }

    return false;
  }

  /**
   * Check if command execution needs interactive user confirmation
   */
  shouldPromptForCommand(command, isDangerous = false) {
    if (this.level === PERMISSION_LEVELS.READ_ONLY) {
      throw new Error(`Permission denied: Cannot execute command '${command}' in Read-Only mode.`);
    }

    if (this.level === PERMISSION_LEVELS.ASK_BEFORE_CHANGES || this.level === PERMISSION_LEVELS.ASK_BEFORE_COMMANDS) {
      return true;
    }

    if (isDangerous) {
      return true; // Dangerous commands always require prompt
    }

    if (this.level === PERMISSION_LEVELS.FULL_AUTO) {
      return false;
    }

    // In CONTROLLED_AUTO: safe read-only commands don't prompt, destructive commands do
    const readOnlyPatterns = /^(node\s+--test|npm\s+test|git\s+status|git\s+diff|git\s+log|dir|ls|pwd|cat|type)\b/i;
    if (readOnlyPatterns.test(command.trim())) {
      return false;
    }

    return true;
  }
}

module.exports = {
  PERMISSION_LEVELS,
  PERMISSION_NAMES,
  PermissionManager
};
