'use strict';

class ReasoningEngine {
  constructor() {}

  analyzeToolResult(toolName, result, error) {
    if (error || (result && result.success === false)) {
      return {
        success: false,
        isError: true,
        type: 'TOOL_FAILURE',
        message: error || (result && result.error) || 'Unknown tool failure',
        recommendation: this.getRecoveryRecommendation(toolName, error || (result && result.error))
      };
    }

    if (toolName === 'execute_command') {
      if (result.exitCode !== 0) {
        return {
          success: false,
          isError: true,
          type: 'COMMAND_FAILURE',
          message: `Command exited with code ${result.exitCode}.\nStderr: ${result.stderr}`,
          recommendation: 'Inspect command stderr output, identify missing dependencies or syntax errors, and fix them.'
        };
      }
    }

    return {
      success: true,
      isError: false,
      type: 'SUCCESS',
      message: 'Tool executed successfully.'
    };
  }

  getRecoveryRecommendation(toolName, errorMsg = '') {
    const err = String(errorMsg).toLowerCase();
    if (err.includes('not found') || err.includes('enoent')) {
      return 'Check the file or directory path. Use list_files or search_files to verify the exact location.';
    }
    if (err.includes('target text sequence not found')) {
      return 'The target string in edit_file must match character-by-character. Read the file with read_file first to see the exact indentation and lines.';
    }
    if (err.includes('security violation')) {
      return 'The path attempted to escape the workspace boundary. Keep all file operations within the workspace root.';
    }
    if (err.includes('timed out')) {
      return 'The operation exceeded the timeout limit. Avoid interactive hanging commands or split into smaller operations.';
    }
    return 'Inspect the error message and adjust arguments accordingly.';
  }

  shouldContinue(iteration, maxIterations, lastResponse) {
    if (iteration >= maxIterations) {
      return { continue: false, reason: 'MAX_ITERATIONS_REACHED' };
    }
    return { continue: true };
  }
}

module.exports = ReasoningEngine;
