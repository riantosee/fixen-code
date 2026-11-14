'use strict';

const fs = require('fs');
const path = require('path');

class CheckpointManager {
  constructor(workspace = process.cwd()) {
    this.workspace = path.resolve(workspace);
    this.fixenDir = path.join(this.workspace, '.fixen');
    this.checkpointDir = path.join(this.fixenDir, 'checkpoints');
    this.activeCheckpointFile = path.join(this.checkpointDir, 'active.json');
    this.init();
  }

  init() {
    if (!fs.existsSync(this.checkpointDir)) {
      try {
        fs.mkdirSync(this.checkpointDir, { recursive: true });
      } catch {}
    }
  }

  saveCheckpoint(sessionId, state = {}) {
    this.init();
    const checkpoint = {
      sessionId,
      task: state.task || '',
      status: state.status || 'RUNNING',
      mode: state.mode || 'auto',
      currentIteration: state.currentIteration || 0,
      maxIterations: state.maxIterations || 25,
      plan: state.plan || null,
      completedStepIds: state.completedStepIds || [],
      currentStepId: state.currentStepId || null,
      modifiedFiles: state.modifiedFiles || [],
      recentMessages: state.recentMessages || [],
      lastToolCall: state.lastToolCall || null,
      updatedAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    try {
      // Write session-specific checkpoint
      const sessionFile = path.join(this.checkpointDir, `${sessionId}.json`);
      const tempFile = `${sessionFile}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(checkpoint, null, 2), 'utf8');
      fs.renameSync(tempFile, sessionFile);

      // Update active pointer
      const activeTemp = `${this.activeCheckpointFile}.tmp.${Date.now()}`;
      fs.writeFileSync(activeTemp, JSON.stringify({ activeSessionId: sessionId, updatedAt: checkpoint.updatedAt }, null, 2), 'utf8');
      fs.renameSync(activeTemp, this.activeCheckpointFile);

      return checkpoint;
    } catch {
      return checkpoint;
    }
  }

  markInterrupted(sessionId, reason = 'Process interrupted or disconnected') {
    this.init();
    const sessionFile = path.join(this.checkpointDir, `${sessionId}.json`);
    let checkpoint = null;

    if (fs.existsSync(sessionFile)) {
      try {
        checkpoint = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      } catch {}
    }

    if (!checkpoint) {
      checkpoint = { sessionId, task: 'Unknown Task', status: 'RUNNING' };
    }

    checkpoint.status = 'INTERRUPTED';
    checkpoint.interruptionReason = reason;
    checkpoint.interruptedAt = new Date().toISOString();

    try {
      fs.writeFileSync(sessionFile, JSON.stringify(checkpoint, null, 2), 'utf8');
    } catch {}

    return checkpoint;
  }

  markCompleted(sessionId) {
    this.init();
    const sessionFile = path.join(this.checkpointDir, `${sessionId}.json`);
    if (fs.existsSync(sessionFile)) {
      try {
        const checkpoint = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        checkpoint.status = 'COMPLETED';
        checkpoint.completedAt = new Date().toISOString();
        fs.writeFileSync(sessionFile, JSON.stringify(checkpoint, null, 2), 'utf8');
      } catch {}
    }

    // Remove active checkpoint pointer if it matches
    if (fs.existsSync(this.activeCheckpointFile)) {
      try {
        const active = JSON.parse(fs.readFileSync(this.activeCheckpointFile, 'utf8'));
        if (active.activeSessionId === sessionId) {
          fs.unlinkSync(this.activeCheckpointFile);
        }
      } catch {}
    }
  }

  getActiveCheckpoint() {
    this.init();
    if (!fs.existsSync(this.activeCheckpointFile)) return null;

    try {
      const active = JSON.parse(fs.readFileSync(this.activeCheckpointFile, 'utf8'));
      if (active.activeSessionId) {
        return this.getCheckpoint(active.activeSessionId);
      }
    } catch {}

    return null;
  }

  getCheckpoint(sessionId) {
    this.init();
    const sessionFile = path.join(this.checkpointDir, `${sessionId}.json`);
    if (!fs.existsSync(sessionFile)) return null;

    try {
      return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    } catch {
      return null;
    }
  }

  getLatestInterruptedSession() {
    const list = this.listCheckpoints();
    // Return newest interrupted session or session left in RUNNING state
    return list.find((c) => c.status === 'INTERRUPTED' || c.status === 'RUNNING') || null;
  }

  listCheckpoints() {
    this.init();
    try {
      const files = fs.readdirSync(this.checkpointDir).filter((f) => f.endsWith('.json') && f !== 'active.json');
      const list = [];
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(this.checkpointDir, file), 'utf8');
          const data = JSON.parse(content);
          list.push(data);
        } catch {}
      }
      return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch {
      return [];
    }
  }

  clearCheckpoint(sessionId) {
    this.init();
    const sessionFile = path.join(this.checkpointDir, `${sessionId}.json`);
    if (fs.existsSync(sessionFile)) {
      try {
        fs.unlinkSync(sessionFile);
      } catch {}
    }
  }
}

module.exports = CheckpointManager;
