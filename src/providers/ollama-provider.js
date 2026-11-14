'use strict';

const BaseProvider = require('./base-provider');

class OllamaProvider extends BaseProvider {
  constructor(config = {}) {
    super('ollama', {
      endpoint: 'http://127.0.0.1:11434/v1',
      defaultModel: 'llama3.2',
      ...config
    });
    this.endpoint = this.config.endpoint || 'http://127.0.0.1:11434/v1';
    this.model = this.config.model || this.config.defaultModel || 'llama3.2';
  }

  async testConnection() {
    try {
      const url = `${this.endpoint.replace(/\/+$/, '')}/models`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        return { success: false, error: `Ollama returned ${response.status}` };
      }
      return { success: true, model: this.model, endpoint: this.endpoint };
    } catch (err) {
      return { success: false, error: `Cannot reach Ollama at ${this.endpoint}: ${err.message}` };
    }
  }

  async chat({ messages, tools = null, temperature = 0.2, maxTokens = 4096 }) {
    const url = `${this.endpoint.replace(/\/+$/, '')}/chat/completions`;
    const payload = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    if (tools && Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Ollama Error (${response.status}): ${errBody}`);
      }

      const data = await response.json();
      this.recordUsage(data.usage);

      const choice = data.choices && data.choices[0];
      const message = choice ? choice.message : {};
      return {
        content: message.content || '',
        toolCalls: message.tool_calls || null,
        finishReason: choice ? choice.finish_reason : null,
        usage: data.usage || null,
        raw: data
      };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }
}

module.exports = OllamaProvider;
