'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { maskSecrets } = require('../security/secret-guard');

class SessionStore {
  constructor(workspace = process.cwd()) {
    this.workspace = path.resolve(workspace);
    this.sessionDir = path.join(this.workspace, '.fixen', 'sessions');
    this.currentSession = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(this.sessionDir)) {
      try {
        fs.mkdirSync(this.sessionDir, { recursive: true });
      } catch {}
    }
  }

  createSession(task = '') {
    const id = `sess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.currentSession = {
      id,
      task: maskSecrets(task),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      plan: [],
      modifiedFiles: [],
      toolCallsCount: 0,
      summary: ''
    };
    this.save();
    return this.currentSession;
  }

  getCurrentSession() {
    if (!this.currentSession) {
      this.createSession('Interactive Session');
    }
    return this.currentSession;
  }

  addMessage(role, content, extra = {}) {
    const session = this.getCurrentSession();
    const msg = {
      role,
      content: typeof content === 'string' ? maskSecrets(content) : content,
      timestamp: new Date().toISOString(),
      ...extra
    };
    session.messages.push(msg);
    session.updatedAt = new Date().toISOString();
    this.save();
    return msg;
  }

  recordFileModification(filePath, backupPath = null, action = 'modified') {
    const session = this.getCurrentSession();
    const entry = {
      path: filePath,
      backupPath,
      action,
      timestamp: new Date().toISOString()
    };
    session.modifiedFiles.push(entry);
    this.save();
  }

  setPlan(planSteps = []) {
    const session = this.getCurrentSession();
    session.plan = planSteps;
    this.save();
  }

  save() {
    if (!this.currentSession) return;
    try {
      this.init();
      const filePath = path.join(this.sessionDir, `${this.currentSession.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(this.currentSession, null, 2), 'utf8');
    } catch {}
  }

  listSessions() {
    this.init();
    try {
      const files = fs.readdirSync(this.sessionDir).filter((f) => f.endsWith('.json'));
      const list = [];
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(this.sessionDir, file), 'utf8');
          const data = JSON.parse(content);
          list.push({
            id: data.id,
            task: data.task,
            createdAt: data.createdAt,
            messagesCount: data.messages ? data.messages.length : 0,
            modifiedFilesCount: data.modifiedFiles ? data.modifiedFiles.length : 0
          });
        } catch {}
      }
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [];
    }
  }

  loadSession(sessionId) {
    const filePath = path.join(this.sessionDir, `${sessionId}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Session '${sessionId}' not found.`);
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.currentSession = data;
    return this.currentSession;
  }

  undoLastModifications() {
    const session = this.getCurrentSession();
    if (!session.modifiedFiles || session.modifiedFiles.length === 0) {
      return { success: false, message: 'No file modifications recorded in this session.' };
    }

    const restored = [];
    const filesToUndo = [...session.modifiedFiles].reverse();

    for (const mod of filesToUndo) {
      const fullPath = path.resolve(this.workspace, mod.path);
      if (mod.backupPath) {
        const fullBackup = path.resolve(this.workspace, mod.backupPath);
        if (fs.existsSync(fullBackup)) {
          fs.copyFileSync(fullBackup, fullPath);
          restored.push(mod.path);
        }
      } else if (mod.action === 'created' && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        restored.push(`${mod.path} (deleted)`);
      }
    }

    return {
      success: true,
      restoredFiles: restored
    };
  }
}

module.exports = SessionStore;
