'use strict';

const BaseProvider = require('./base-provider');

class GroqProvider extends BaseProvider {
  constructor(config = {}) {
    super('groq', {
      endpoint: 'https://api.groq.com/openai/v1',
      defaultModel: 'llama-3.3-70b-versatile',
      ...config
    });
    this.endpoint = this.config.endpoint || 'https://api.groq.com/openai/v1';
    this.model = this.config.model || this.config.defaultModel || 'llama-3.3-70b-versatile';
    this.apiKey = this.config.apiKey || process.env.GROQ_API_KEY;
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  setModel(model) {
    this.model = model;
  }

  async testConnection() {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'GROQ_API_KEY is not configured. Set GROQ_API_KEY in environment or run "fixen config set providers.groq.apiKey <key>".'
      };
    }

    try {
      const res = await this.chat({
        messages: [{ role: 'user', content: 'Respond with "FIXEN_OK" only.' }],
        maxTokens: 10
      });
      return {
        success: true,
        model: this.model,
        response: res.content
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  async chat({ messages, tools = null, temperature = 0.2, maxTokens = 4096 }) {
    if (!this.apiKey) {
      throw new Error('Groq API Key is missing. Export GROQ_API_KEY or configure via "fixen config".');
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

    let attempt = 0;
    let lastError = null;

    while (attempt <= this.maxRetries) {
      attempt++;
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
          let parsedMsg = errBody;
          try {
            const json = JSON.parse(errBody);
            parsedMsg = json.error ? (json.error.message || json.error) : errBody;
          } catch {}

          // Handle 429 rate limit or 5xx temporary server error
          if ((response.status === 429 || response.status >= 500) && attempt <= this.maxRetries) {
            const retryAfterHeader = response.headers.get('retry-after');
            const waitMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }

          throw new Error(`Groq API Error (${response.status}): ${parsedMsg}`);
        }

        const data = await response.json();
        this.recordUsage(data.usage);

        const choice = data.choices && data.choices[0];
        if (!choice) {
          throw new Error('Groq returned empty choices');
        }

        const message = choice.message || {};
        return {
          content: message.content || '',
          toolCalls: message.tool_calls || null,
          finishReason: choice.finish_reason,
          usage: data.usage || null,
          raw: data
        };
      } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          lastError = new Error(`Groq request timed out after ${this.timeoutMs}ms (attempt ${attempt}/${this.maxRetries + 1})`);
        } else {
          lastError = err;
        }

        if (attempt <= this.maxRetries) {
          const backoff = 1000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    throw lastError || new Error('Failed to communicate with Groq API');
  }

  async chatStream({ messages, tools = null, temperature = 0.2, maxTokens = 4096, onToken = () => {} }) {
    if (!this.apiKey) {
      throw new Error('Groq API Key is missing. Export GROQ_API_KEY or configure via "fixen config".');
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

    let attempt = 0;
    let lastError = null;

    while (attempt <= this.maxRetries) {
      attempt++;
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
          let parsedMsg = errBody;
          try { const json = JSON.parse(errBody); parsedMsg = json.error ? (json.error.message || json.error) : errBody; } catch {}

          if ((response.status === 429 || response.status >= 500) && attempt <= this.maxRetries) {
            const retryAfterHeader = response.headers.get('retry-after');
            const waitMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
          throw new Error(`Groq API Error (${response.status}): ${parsedMsg}`);
        }

        return await this._parseSSEStream(response, onToken);
      } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          lastError = new Error(`Groq stream timed out after ${this.timeoutMs}ms (attempt ${attempt}/${this.maxRetries + 1})`);
        } else {
          lastError = err;
        }
        if (attempt <= this.maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError || new Error('Failed to stream from Groq API');
  }

  async _parseSSEStream(response, onToken) {
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

            if (chunk.choices[0].finish_reason) {
              finishReason = chunk.choices[0].finish_reason;
            }
            if (chunk.usage) {
              usage = chunk.usage;
            }
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
  }
}

module.exports = GroqProvider;
