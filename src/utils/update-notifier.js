'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const colors = require('../cli/colors');
const { createBox } = require('../cli/box');

class UpdateNotifier {
  constructor(currentVersion, options = {}) {
    this.currentVersion = currentVersion;
    this.packageName = options.packageName || 'fixen-code';
    this.cacheDir = path.join(os.homedir(), '.fixen');
    this.cacheFile = path.join(this.cacheDir, 'update-check.json');
    this.checkIntervalMs = options.checkIntervalMs || 12 * 60 * 60 * 1000; // 12 hours
    this.timeoutMs = options.timeoutMs || 3000;
  }

  isNewer(latest, current) {
    if (!latest || !current) return false;
    const lParts = latest.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
    const cParts = current.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

    for (let i = 0; i < 3; i++) {
      if ((lParts[i] || 0) > (cParts[i] || 0)) return true;
      if ((lParts[i] || 0) < (cParts[i] || 0)) return false;
    }
    return false;
  }

  loadCached() {
    if (!fs.existsSync(this.cacheFile)) return null;
    try {
      const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      if (Date.now() - data.lastChecked < this.checkIntervalMs) {
        return data;
      }
    } catch {}
    return null;
  }

  saveCache(latestVersion) {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify({
        lastChecked: Date.now(),
        latestVersion
      }), 'utf8');
    } catch {}
  }

  async fetchLatestVersion() {
    const cached = this.loadCached();
    if (cached && cached.latestVersion) {
      return cached.latestVersion;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `https://registry.npmjs.org/${this.packageName}/latest`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) return null;
      const data = await res.json();
      const latest = data.version;

      if (latest) {
        this.saveCache(latest);
      }
      return latest;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  async check() {
    try {
      const latest = await this.fetchLatestVersion();
      if (latest && this.isNewer(latest, this.currentVersion)) {
        return {
          hasUpdate: true,
          current: this.currentVersion,
          latest,
          updateCommand: `npm install -g ${this.packageName}`
        };
      }
    } catch {}

    return { hasUpdate: false, current: this.currentVersion };
  }

  renderAlert(updateInfo) {
    if (!updateInfo || !updateInfo.hasUpdate) return '';

    const lines = [
      `${colors.bold('Update available:')} ${colors.dim(updateInfo.current)} → ${colors.green(colors.bold(updateInfo.latest))}`,
      `Run ${colors.cyan(colors.bold(updateInfo.updateCommand))} to upgrade`,
      `${colors.dim(`Or run: ${colors.bold('fixen upgrade')}`)}`
    ];

    return '\n' + createBox(lines, {
      title: '📦 NEW VERSION AVAILABLE',
      borderColor: 'yellow',
      padding: 1
    }) + '\n';
  }
}

module.exports = UpdateNotifier;
