'use strict';

const BaseProvider = require('./base-provider');

class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super('openai', {
      endpoint: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
      ...config
    });
    this.endpoint = this.config.endpoint || 'https://api.openai.com/v1';
    this.model = this.config.model || this.config.defaultModel || 'gpt-4o';
    this.apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'OPENAI_API_KEY is not configured.' };
    }
    try {
      const res = await this.chat({
        messages: [{ role: 'user', content: 'Respond with "FIXEN_OK" only.' }],
        maxTokens: 10
      });
      return { success: true, model: this.model, response: res.content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async chat({ messages, tools = null, temperature = 0.2, maxTokens = 4096 }) {
    if (!this.apiKey) {
      throw new Error('OpenAI API Key is missing. Export OPENAI_API_KEY or configure via fixen config.');
    }

    const url = `${this.endpoint.replace(/\/+$/, '')}/chat/completions`;
    const payload = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    if (tools && Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`OpenAI API Error (${response.status}): ${errBody}`);
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

module.exports = OpenAIProvider;
