'use strict';

class BaseProvider {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.model = config.model || config.defaultModel;
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs || 60000;
    this.maxRetries = config.maxRetries || 3;
    this.usageStats = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      calls: 0
    };
  }

  getUsageStats() {
    return { ...this.usageStats };
  }

  recordUsage(usage) {
    if (!usage) return;
    this.usageStats.calls++;
    if (usage.prompt_tokens) this.usageStats.promptTokens += usage.prompt_tokens;
    if (usage.completion_tokens) this.usageStats.completionTokens += usage.completion_tokens;
    if (usage.total_tokens) this.usageStats.totalTokens += usage.total_tokens;
  }

  async testConnection() {
    throw new Error(`testConnection() not implemented for ${this.name}`);
  }

  async chat(params) {
    throw new Error(`chat() not implemented for ${this.name}`);
  }

  async chatStream(params) {
    // Default fallback: use non-streaming chat, emit full content as single token
    const result = await this.chat(params);
    if (params.onToken && result.content) {
      params.onToken(result.content);
    }
    return result;
  }

  async listModels() {
    return this.config.models || [];
  }
}

module.exports = BaseProvider;
