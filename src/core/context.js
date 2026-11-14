'use strict';

class ContextManager {
  constructor(options = {}) {
    this.maxTokens = options.maxContextTokens || 16384;
    this.systemPrompt = options.systemPrompt || '';
    this.messages = [];
  }

  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
  }

  getSystemPrompt() {
    return this.systemPrompt;
  }

  addMessage(role, content, extra = {}) {
    this.messages.push({
      role,
      content,
      ...extra
    });
  }

  estimateTokens(text) {
    if (!text) return 0;
    if (typeof text === 'object') {
      text = JSON.stringify(text);
    }
    // Rough heuristic: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  getTotalTokens() {
    let tokens = this.estimateTokens(this.systemPrompt);
    for (const msg of this.messages) {
      tokens += this.estimateTokens(msg.content);
      if (msg.tool_calls) {
        tokens += this.estimateTokens(msg.tool_calls);
      }
    }
    return tokens;
  }

  compactIfNeeded(targetBudget = null) {
    const budget = targetBudget || this.maxTokens * 0.75;
    let currentTokens = this.getTotalTokens();

    if (currentTokens <= budget || this.messages.length <= 4) {
      return false; // No compaction needed
    }

    // Keep system prompt, initial user prompt, and recent 4 messages intact
    const firstUserMsg = this.messages.find((m) => m.role === 'user');
    const recentMessages = this.messages.slice(-4);
    const middleMessages = this.messages.slice(1, -4);

    if (middleMessages.length === 0) return false;

    // Summarize older middle tool outputs and actions
    const summaryPoints = [];
    for (const msg of middleMessages) {
      if (msg.role === 'tool') {
        const preview = typeof msg.content === 'string' ? msg.content.slice(0, 100) : '';
        summaryPoints.push(`Tool ${msg.name || 'call'} returned: ${preview}...`);
      } else if (msg.role === 'assistant' && msg.content) {
        summaryPoints.push(`Assistant: ${msg.content.slice(0, 100)}...`);
      }
    }

    const compactedNotice = {
      role: 'system',
      content: `[Previous ${middleMessages.length} interaction steps compacted]:\n` + summaryPoints.slice(-10).join('\n')
    };

    this.messages = [
      firstUserMsg || { role: 'user', content: 'Begin task' },
      compactedNotice,
      ...recentMessages
    ];

    return true;
  }

  getMessagesForProvider() {
    const list = [];
    if (this.systemPrompt) {
      list.push({ role: 'system', content: this.systemPrompt });
    }
    for (const m of this.messages) {
      const item = { role: m.role, content: m.content };
      if (m.tool_calls) item.tool_calls = m.tool_calls;
      if (m.tool_call_id) item.tool_call_id = m.tool_call_id;
      if (m.name) item.name = m.name;
      list.push(item);
    }
    return list;
  }
}

module.exports = ContextManager;
