'use strict';

const colors = require('./colors');
const { getPlatformInfo } = require('../terminal/platform');
const { createBox } = require('./box');

function getBanner(version = '0.1.0', config = {}) {
  const info = getPlatformInfo();

  if (info.columns < 55) {
    // Ultra-clean compact layout for Termux
    return [
      colors.cyan(colors.bold('┌── FIXEN CODE ───────────────────┐')),
      `│ ${colors.bold('Build Anything. Fix Everything.')} │`,
      `│ ${colors.dim(`v${version} • ${info.os}`)}           │`,
      colors.cyan('└─────────────────────────────────┘'),
      ''
    ].join('\n');
  }

  const art = [
    '  ███████╗██╗██╗  ██╗███████╗███╗   ██╗',
    '  ██╔════╝██║╚██╗██╔╝██╔════╝████╗  ██║',
    '  █████╗  ██║ ╚███╔╝ █████╗  ██╔██╗ ██║',
    '  ██╔══╝  ██║ ██╔██╗ ██╔══╝  ██║╚██╗██║',
    '  ██║     ██║██╔╝ ██╗███████╗██║ ╚████║',
    '  ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝'
  ].map((l) => colors.cyan(colors.bold(l))).join('\n');

  const title = colors.bold('  FIXEN CODE') + colors.dim(` v${version}`);
  const tagline = colors.gray('  Autonomous Software Engineering Agent • Build Anything. Fix Everything.');
  const sysInfo = colors.dim(`  Platform: ${info.os} (${info.arch}) | Node: ${info.nodeVersion}`);

  // Badges row
  const provider = (config.provider || 'groq').toUpperCase();
  const model = config.model || 'llama-3.3-70b-versatile';
  const mode = (config.mode || 'auto').toUpperCase();

  const badges = [
    colors.badge(`PROVIDER: ${provider}`, 'magenta'),
    colors.badge(`MODEL: ${model}`, 'cyan'),
    colors.badge(`MODE: ${mode}`, 'green')
  ].join('  ');

  const shortcuts = colors.dim('  Commands: /help • /auto • /plan • /review • /skills • /resume • /undo');

  return [
    art,
    '',
    title,
    tagline,
    sysInfo,
    `  ${badges}`,
    shortcuts,
    ''
  ].join('\n');
}

function printBanner(version, config = {}) {
  process.stdout.write(getBanner(version, config) + '\n');
}

module.exports = {
  getBanner,
  printBanner
};
