'use strict';

const colors = require('./colors');
const { createBox } = require('./box');

function renderSummaryCard(result = {}, options = {}) {
  const status = result.status || 'COMPLETED';
  const isSuccess = status === 'SUCCESS';
  const statusColor = isSuccess ? 'green' : (status === 'CANCELLED' ? 'yellow' : 'red');
  const statusIcon = isSuccess ? '✔' : (status === 'CANCELLED' ? '⚠' : '✖');

  const lines = [];

  // 1. Status row
  lines.push(`${colors.bold('Status:')}     ${colors[statusColor](`${statusIcon} ${status}`)} ${result.verified ? colors.green('(Verified)') : colors.dim('(Unverified)')}`);

  // 2. Iterations & Duration
  if (result.iterations !== undefined) {
    const maxIter = options.maxIterations || 25;
    lines.push(`${colors.bold('Iterations:')} ${result.iterations} / ${maxIter}`);
  }

  if (options.durationMs) {
    const sec = (options.durationMs / 1000).toFixed(2);
    lines.push(`${colors.bold('Duration:')}   ${sec}s`);
  }

  // 3. Tokens
  if (options.usageStats) {
    const { promptTokens = 0, completionTokens = 0, totalTokens = 0 } = options.usageStats;
    if (totalTokens > 0) {
      lines.push(`${colors.bold('Tokens:')}     ${promptTokens.toLocaleString()} prompt | ${completionTokens.toLocaleString()} comp | ${colors.cyan(totalTokens.toLocaleString() + ' total')}`);
    }
  }

  // 4. Files
  if (result.modifiedFiles && result.modifiedFiles.length > 0) {
    lines.push('');
    lines.push(colors.bold(`Modified Files (${result.modifiedFiles.length}):`));
    for (const f of result.modifiedFiles) {
      lines.push(`  ${colors.green('•')} ${colors.cyan(f)}`);
    }
  }

  return createBox(lines, {
    title: `EXECUTION SUMMARY`,
    borderColor: statusColor,
    padding: 1
  });
}

module.exports = {
  renderSummaryCard
};
