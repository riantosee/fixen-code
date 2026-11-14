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

  async chatStream({ messages, tools = null, temperature = 0.2, maxTokens = 4096, onToken = () => {} }) {
    if (!this.apiKey) {
      throw new Error('OpenAI API Key is missing. Export OPENAI_API_KEY or configure via fixen config.');
    }

    const url = `${this.endpoint.replace(/\/+$/, '')}/chat/completions`;
    const payload = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true
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

      // Reuse same SSE parser pattern as Groq
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let toolCalls = [];
      let finishReason = null;
      let usage = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const chunk = JSON.parse(trimmed.slice(6));
              const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
              if (!delta) continue;

              if (delta.content) {
                fullContent += delta.content;
                onToken(delta.content);
              }

              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index || 0;
                  if (!toolCalls[idx]) {
                    toolCalls[idx] = { id: tc.id || '', type: 'function', function: { name: '', arguments: '' } };
                  }
                  if (tc.id) toolCalls[idx].id = tc.id;
                  if (tc.function) {
                    if (tc.function.name) toolCalls[idx].function.name += tc.function.name;
                    if (tc.function.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
                  }
                }
              }

              if (chunk.choices[0].finish_reason) finishReason = chunk.choices[0].finish_reason;
              if (chunk.usage) usage = chunk.usage;
            } catch {}
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (usage) this.recordUsage(usage);

      return {
        content: fullContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : null,
        finishReason,
        usage,
        raw: null
      };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }
}

module.exports = OpenAIProvider;
