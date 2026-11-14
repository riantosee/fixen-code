'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');

function isTermux() {
  if (process.env.TERMUX_VERSION) return true;
  if (process.platform === 'android') return true;
  if (fs.existsSync('/data/data/com.termux')) return true;
  return false;
}

function getShell() {
  const platform = os.platform();

  if (isTermux()) {
    if (process.env.SHELL && fs.existsSync(process.env.SHELL)) {
      return process.env.SHELL;
    }
    if (fs.existsSync('/data/data/com.termux/files/usr/bin/bash')) {
      return '/data/data/com.termux/files/usr/bin/bash';
    }
    return 'sh';
  }

  if (platform === 'win32') {
    // Prefer PowerShell if available, fallback to cmd.exe
    const systemRoot = process.env.SystemRoot || 'C:\\Windows';
    const powershellPath = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    if (fs.existsSync(powershellPath)) {
      return powershellPath;
    }
    return process.env.ComSpec || 'cmd.exe';
  }

  return process.env.SHELL || '/bin/bash';
}

function getPlatformInfo() {
  const platform = os.platform();
  const termux = isTermux();

  let osName = 'Unknown';
  if (termux) {
    osName = 'Android (Termux)';
  } else if (platform === 'win32') {
    osName = 'Windows';
  } else if (platform === 'darwin') {
    osName = 'macOS';
  } else if (platform === 'linux') {
    osName = 'Linux';
  }

  const isTTY = Boolean(process.stdout && process.stdout.isTTY);
  const columns = isTTY && process.stdout.columns ? process.stdout.columns : 80;
  const rows = isTTY && process.stdout.rows ? process.stdout.rows : 24;

  const colorSupport = Boolean(
    process.env.FORCE_COLOR ||
    (!process.env.NO_COLOR && isTTY && (
      process.env.TERM && process.env.TERM !== 'dumb' ||
      platform === 'win32' ||
      termux
    ))
  );

  return {
    os: osName,
    platform,
    isTermux: termux,
    arch: os.arch(),
    nodeVersion: process.version,
    shell: getShell(),
    columns,
    rows,
    isTTY,
    supportsColor: colorSupport,
    homeDir: os.homedir(),
    tmpDir: os.tmpdir(),
    lineEnding: platform === 'win32' ? '\r\n' : '\n'
  };
}

module.exports = {
  isTermux,
  getShell,
  getPlatformInfo
};
