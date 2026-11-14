'use strict';

const colors = require('./colors');
const { getPlatformInfo } = require('../terminal/platform');

function stripAnsi(str) {
  return typeof str === 'string' ? str.replace(/\x1b\[[0-9;]*m/g, '') : '';
}

function stringWidth(str) {
  return stripAnsi(str).length;
}

function createBox(lines, options = {}) {
  const platform = getPlatformInfo();
  const maxTermWidth = Math.max(30, (platform.columns || 80) - 2);

  const title = options.title ? ` ${options.title} ` : '';
  const borderColor = options.borderColor || 'cyan';
  const borderFn = colors[borderColor] || colors.cyan;
  const padding = options.padding !== undefined ? options.padding : 1;

  // Use rounded borders or ASCII if requested
  const chars = options.ascii ? {
    tl: '+', tr: '+', bl: '+', br: '+',
    h: '-', v: '|'
  } : {
    tl: '╭', tr: '╮', bl: '╰', br: '╯',
    h: '─', v: '│'
  };

  const lineArray = Array.isArray(lines) ? lines : String(lines).split('\n');

  // Compute maximum content width
  let contentWidth = stringWidth(title);
  for (const line of lineArray) {
    const w = stringWidth(line);
    if (w > contentWidth) contentWidth = w;
  }

  // Ensure within terminal bounds
  contentWidth = Math.min(contentWidth, maxTermWidth - (padding * 2) - 2);
  const innerWidth = contentWidth + (padding * 2);

  // Top border
  let topHeader = '';
  if (title) {
    const titleLen = stringWidth(title);
    const leftDashes = 2;
    const rightDashes = Math.max(0, innerWidth - leftDashes - titleLen);
    topHeader = borderFn(chars.tl + chars.h.repeat(leftDashes)) +
      colors.bold(borderFn(title)) +
      borderFn(chars.h.repeat(rightDashes) + chars.tr);
  } else {
    topHeader = borderFn(chars.tl + chars.h.repeat(innerWidth) + chars.tr);
  }

  const output = [topHeader];

  // Top padding
  for (let p = 0; p < (options.verticalPadding || 0); p++) {
    output.push(borderFn(chars.v) + ' '.repeat(innerWidth) + borderFn(chars.v));
  }

  // Content lines
  for (const line of lineArray) {
    const stripped = stripAnsi(line);
    const visibleLen = stripped.length;

    let paddedContent = '';
    if (visibleLen > contentWidth) {
      // Truncate if overflows terminal width
      paddedContent = ' '.repeat(padding) + line.slice(0, contentWidth - 3) + '...' + ' '.repeat(padding);
    } else {
      const spaceRight = Math.max(0, contentWidth - visibleLen);
      paddedContent = ' '.repeat(padding) + line + ' '.repeat(spaceRight) + ' '.repeat(padding);
    }

    output.push(borderFn(chars.v) + paddedContent + borderFn(chars.v));
  }

  // Bottom padding
  for (let p = 0; p < (options.verticalPadding || 0); p++) {
    output.push(borderFn(chars.v) + ' '.repeat(innerWidth) + borderFn(chars.v));
  }

  // Bottom border
  output.push(borderFn(chars.bl + chars.h.repeat(innerWidth) + chars.br));

  return output.join('\n');
}

module.exports = {
  createBox,
  stripAnsi,
  stringWidth
};
