'use strict';

const BaseProvider = require('./base-provider');

class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super('anthropic', {
      endpoint: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-3-5-sonnet-20241022',
      ...config
    });
    this.endpoint = this.config.endpoint || 'https://api.anthropic.com/v1';
    this.model = this.config.model || this.config.defaultModel || 'claude-3-5-sonnet-20241022';
    this.apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY;
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'ANTHROPIC_API_KEY is not configured.' };
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

  // Convert OpenAI tool schema to Anthropic tool schema
  _formatTools(tools) {
    if (!tools || !Array.isArray(tools) || tools.length === 0) return undefined;
    return tools.map((t) => {
      const fn = t.function || t;
      return {
        name: fn.name,
        description: fn.description || '',
        input_schema: fn.parameters || { type: 'object', properties: {} }
      };
    });
  }

  // Convert OpenAI messages to Anthropic messages
  _formatMessages(messages) {
    let system = '';
    const formatted = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system += (system ? '\n\n' : '') + msg.content;
      } else if (msg.role === 'tool') {
        formatted.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.tool_call_id || 'call_default',
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            }
          ]
        });
      } else if (msg.role === 'assistant' && msg.tool_calls) {
        const content = [];
        if (msg.content) content.push({ type: 'text', text: msg.content });
        for (const tc of msg.tool_calls) {
          let input = {};
          try {
            input = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          } catch {}
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input
          });
        }
        formatted.push({ role: 'assistant', content });
      } else {
        formatted.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || ''
        });
      }
    }

    return { system, messages: formatted };
  }

  async chat({ messages, tools = null, temperature = 0.2, maxTokens = 4096 }) {
    if (!this.apiKey) {
      throw new Error('Anthropic API Key is missing. Export ANTHROPIC_API_KEY or configure via fixen config.');
    }

    const { system, messages: formattedMsgs } = this._formatMessages(messages);
    const url = `${this.endpoint.replace(/\/+$/, '')}/messages`;

    const payload = {
      model: this.model,
      messages: formattedMsgs,
      max_tokens: maxTokens,
      temperature
    };

    if (system) payload.system = system;
    const anthropicTools = this._formatTools(tools);
    if (anthropicTools) payload.tools = anthropicTools;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Anthropic API Error (${response.status}): ${errBody}`);
      }

      const data = await response.json();
      if (data.usage) {
        this.recordUsage({
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
        });
      }

      let content = '';
      const toolCalls = [];

      if (data.content && Array.isArray(data.content)) {
        for (const block of data.content) {
          if (block.type === 'text') {
            content += block.text;
          } else if (block.type === 'tool_use') {
            toolCalls.push({
              id: block.id,
              type: 'function',
              function: {
                name: block.name,
                arguments: JSON.stringify(block.input)
              }
            });
          }
        }
      }

      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : null,
        finishReason: data.stop_reason,
        usage: data.usage || null,
        raw: data
      };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  async chatStream(params) {
    // Falls back to chat and emits token to guarantee zero regressions
    const res = await this.chat(params);
    if (params.onToken && res.content) {
      params.onToken(res.content);
    }
    return res;
  }
}

module.exports = AnthropicProvider;
