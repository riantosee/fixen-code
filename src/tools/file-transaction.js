'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

class FileTransaction {
  constructor(pathGuard) {
    this.pathGuard = pathGuard;
    this.operations = [];
    this.backups = [];
    this.active = false;
    this.txDir = path.join(os.tmpdir(), `fixen-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  }

  begin() {
    if (this.active) throw new Error('Transaction already active');
    this.active = true;
    this.operations = [];
    this.backups = [];
    fs.mkdirSync(this.txDir, { recursive: true });
    return this;
  }

  addWrite(filePath, content) {
    if (!this.active) throw new Error('No active transaction. Call begin() first.');
    this.operations.push({ type: 'write', path: filePath, content });
    return this;
  }

  addEdit(filePath, target, replacement) {
    if (!this.active) throw new Error('No active transaction. Call begin() first.');
    this.operations.push({ type: 'edit', path: filePath, target, replacement });
    return this;
  }

  addDelete(filePath) {
    if (!this.active) throw new Error('No active transaction. Call begin() first.');
    this.operations.push({ type: 'delete', path: filePath });
    return this;
  }

  _backupFile(resolvedPath) {
    if (!fs.existsSync(resolvedPath)) return null;
    const backupName = `${this.backups.length}_${path.basename(resolvedPath)}`;
    const backupPath = path.join(this.txDir, backupName);
    fs.copyFileSync(resolvedPath, backupPath);
    return backupPath;
  }

  commit() {
    if (!this.active) throw new Error('No active transaction.');
    const completed = [];

    try {
      for (const op of this.operations) {
        const resolved = this.pathGuard.resolvePath(op.path);

        // Backup existing file before any mutation
        const backup = this._backupFile(resolved);
        this.backups.push({ resolvedPath: resolved, backupPath: backup, existed: fs.existsSync(resolved) });

        if (op.type === 'write') {
          const dir = path.dirname(resolved);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const tmp = `${resolved}.tx.${Date.now()}`;
          fs.writeFileSync(tmp, op.content, 'utf8');
          fs.renameSync(tmp, resolved);
        } else if (op.type === 'edit') {
          const content = fs.readFileSync(resolved, 'utf8');
          if (!content.includes(op.target)) {
            throw new Error(`Edit target not found in '${op.path}'`);
          }
          const newContent = content.replace(op.target, op.replacement);
          const tmp = `${resolved}.tx.${Date.now()}`;
          fs.writeFileSync(tmp, newContent, 'utf8');
          fs.renameSync(tmp, resolved);
        } else if (op.type === 'delete') {
          if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
        }

        completed.push(op);
      }

      this.active = false;
      this._cleanupTxDir();
      return { success: true, filesModified: completed.length };
    } catch (err) {
      // Rollback on failure
      this.rollback();
      throw new Error(`Transaction failed (rolled back ${completed.length} operations): ${err.message}`);
    }
  }

  rollback() {
    for (let i = this.backups.length - 1; i >= 0; i--) {
      const { resolvedPath, backupPath, existed } = this.backups[i];
      try {
        if (backupPath && fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, resolvedPath);
        } else if (!existed && fs.existsSync(resolvedPath)) {
          fs.unlinkSync(resolvedPath);
        }
      } catch {}
    }

    this.active = false;
    this._cleanupTxDir();
  }

  _cleanupTxDir() {
    try {
      if (fs.existsSync(this.txDir)) {
        const files = fs.readdirSync(this.txDir);
        for (const f of files) fs.unlinkSync(path.join(this.txDir, f));
        fs.rmdirSync(this.txDir);
      }
    } catch {}
  }

  getModifiedFiles() {
    return this.operations.map(op => op.path);
  }
}

module.exports = FileTransaction;
