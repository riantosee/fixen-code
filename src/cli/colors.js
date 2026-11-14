'use strict';

const { getPlatformInfo } = require('../terminal/platform');

const platform = getPlatformInfo();
let enabled = platform.supportsColor;

function setColorEnabled(val) {
  enabled = Boolean(val);
}

function wrap(start, end) {
  return (text) => (enabled ? `\x1b[${start}m${text}\x1b[${end}m` : String(text));
}

const colors = {
  reset: wrap(0, 0),
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  italic: wrap(3, 23),
  underline: wrap(4, 24),
  inverse: wrap(7, 27),

  black: wrap(30, 39),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  white: wrap(37, 39),
  gray: wrap(90, 39),

  bgBlack: wrap(40, 49),
  bgRed: wrap(41, 49),
  bgGreen: wrap(42, 49),
  bgYellow: wrap(43, 49),
  bgBlue: wrap(44, 49),
  bgMagenta: wrap(45, 49),
  bgCyan: wrap(46, 49),
  bgWhite: wrap(47, 49),

  setColorEnabled,
  isEnabled: () => enabled,

  badge(label, color = 'cyan') {
    const fn = colors[color] || colors.cyan;
    return fn(`[${label}]`);
  },

  success(text) {
    return `${colors.green('✔')} ${text}`;
  },

  info(text) {
    return `${colors.cyan('ℹ')} ${text}`;
  },

  warn(text) {
    return `${colors.yellow('⚠')} ${text}`;
  },

  error(text) {
    return `${colors.red('✖')} ${text}`;
  },

  step(n, text) {
    return `${colors.cyan(`[${n}]`)} ${colors.bold(text)}`;
  }
};

module.exports = colors;
