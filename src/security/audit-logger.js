'use strict';

const fs = require('fs');
const path = require('path');
const { maskSecrets } = require('./secret-guard');

class AuditLogger {
  constructor(logDir) {
    this.logDir = logDir;
    this.logFile = logDir ? path.join(logDir, 'audit.log') : null;
    this.inMemoryLogs = [];
    this.init();
  }

  init() {
    if (this.logDir) {
      try {
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }
      } catch (err) {
        // Fallback to in-memory only if directory cannot be created
      }
    }
  }

  log(event, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      details: this.sanitize(details)
    };

    this.inMemoryLogs.push(entry);

    if (this.logFile) {
      try {
        const line = JSON.stringify(entry) + '\n';
        fs.appendFileSync(this.logFile, line, 'utf8');
      } catch (err) {
        // Ignore file write errors for audit log
      }
    }

    return entry;
  }

  sanitize(obj) {
    if (typeof obj === 'string') {
      return maskSecrets(obj);
    }
    if (obj && typeof obj === 'object') {
      const copy = Array.isArray(obj) ? [] : {};
      for (const [k, v] of Object.entries(obj)) {
        copy[k] = this.sanitize(v);
      }
      return copy;
    }
    return obj;
  }

  getRecentLogs(count = 20) {
    return this.inMemoryLogs.slice(-count);
  }
}

module.exports = AuditLogger;
