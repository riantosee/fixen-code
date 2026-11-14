'use strict';

const colors = require('../cli/colors');

/**
 * Computes a standard unified diff between two strings.
 * Zero external dependencies.
 */
function createDiff(oldStr, newStr, filename = 'file') {
  const oldLines = oldStr === '' ? [] : oldStr.split(/\r?\n/);
  const newLines = newStr === '' ? [] : newStr.split(/\r?\n/);

  // Compute Longest Common Subsequence (LCS) matrix
  const matrix = Array(oldLines.length + 1).fill(null).map(() => Array(newLines.length + 1).fill(0));

  for (let i = 0; i < oldLines.length; i++) {
    for (let j = 0; j < newLines.length; j++) {
      if (oldLines[i] === newLines[j]) {
        matrix[i + 1][j + 1] = matrix[i][j] + 1;
      } else {
        matrix[i + 1][j + 1] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  // Backtrack to build edit operations
  const edits = [];
  let i = oldLines.length;
  let j = newLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      edits.unshift({ type: 'same', line: oldLines[i - 1], oldIdx: i, newIdx: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      edits.unshift({ type: 'add', line: newLines[j - 1], newIdx: j });
      j--;
    } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
      edits.unshift({ type: 'del', line: oldLines[i - 1], oldIdx: i });
      i--;
    }
  }

  // Group into hunks with context
  const hunks = [];
  let currentHunk = null;
  const contextSize = 3;

  for (let idx = 0; idx < edits.length; idx++) {
    const edit = edits[idx];
    const isChange = edit.type !== 'same';

    if (isChange) {
      if (!currentHunk) {
        // Look back for leading context
        const start = Math.max(0, idx - contextSize);
        currentHunk = edits.slice(start, idx);
      }
      currentHunk.push(edit);
    } else if (currentHunk) {
      currentHunk.push(edit);
      // Check if we should close the hunk
      const trailingSames = currentHunk.slice(-contextSize).filter((e) => e.type === 'same');
      if (trailingSames.length >= contextSize) {
        // Peek ahead to see if another change comes within contextSize
        let nextChange = -1;
        for (let k = idx + 1; k < Math.min(edits.length, idx + 1 + contextSize); k++) {
          if (edits[k].type !== 'same') {
            nextChange = k;
            break;
          }
        }
        if (nextChange === -1) {
          hunks.push(currentHunk);
          currentHunk = null;
        }
      }
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  if (hunks.length === 0) {
    return 'No changes detected.';
  }

  const lines = [
    `--- a/${filename}`,
    `+++ b/${filename}`
  ];

  for (const hunk of hunks) {
    let oldStart = 0;
    let oldCount = 0;
    let newStart = 0;
    let newCount = 0;

    for (const item of hunk) {
      if (item.type === 'same') {
        if (!oldStart) oldStart = item.oldIdx;
        if (!newStart) newStart = item.newIdx;
        oldCount++;
        newCount++;
      } else if (item.type === 'del') {
        if (!oldStart) oldStart = item.oldIdx;
        oldCount++;
      } else if (item.type === 'add') {
        if (!newStart) newStart = item.newIdx;
        newCount++;
      }
    }

    lines.push(`@@ -${oldStart || 1},${oldCount} +${newStart || 1},${newCount} @@`);

    for (const item of hunk) {
      if (item.type === 'same') {
        lines.push(` ${item.line}`);
      } else if (item.type === 'del') {
        lines.push(`-${item.line}`);
      } else if (item.type === 'add') {
        lines.push(`+${item.line}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format diff with ANSI colors
 */
function formatColorDiff(diffText) {
  return diffText
    .split('\n')
    .map((line) => {
      if (line.startsWith('---') || line.startsWith('+++')) {
        return colors.bold(line);
      }
      if (line.startsWith('@@')) {
        return colors.cyan(line);
      }
      if (line.startsWith('+')) {
        return colors.green(line);
      }
      if (line.startsWith('-')) {
        return colors.red(line);
      }
      return colors.gray(line);
    })
    .join('\n');
}

module.exports = {
  createDiff,
  formatColorDiff
};
