'use strict';

const colors = require('./colors');
const { getPlatformInfo } = require('../terminal/platform');

function getBanner(version = '0.1.0') {
  const info = getPlatformInfo();

  if (info.columns < 50) {
    // Compact banner for narrow screens / Termux
    return [
      colors.cyan(colors.bold('=== FIXEN CODE ===')),
      colors.gray('Build Anything. Fix Everything.'),
      colors.dim(`v${version} | ${info.os}`),
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

  const title = colors.bold('  FIXEN CODE');
  const tagline = colors.gray('  Build Anything. Fix Everything.');
  const meta = colors.dim(`  v${version} | ${info.os} (${info.arch}) | Node ${info.nodeVersion}`);

  return `${art}\n\n${title}\n${tagline}\n${meta}\n`;
}

function printBanner(version) {
  process.stdout.write(getBanner(version) + '\n');
}

module.exports = {
  getBanner,
  printBanner
};
