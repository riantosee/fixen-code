'use strict';

const GroqProvider = require('./groq-provider');
const OpenAIProvider = require('./openai-provider');
const GeminiProvider = require('./gemini-provider');
const OllamaProvider = require('./ollama-provider');
const AnthropicProvider = require('./anthropic-provider');

class ProviderFactory {
  static create(providerName = 'groq', configManager) {
    const name = (providerName || 'groq').toLowerCase();
    const providersConfig = configManager ? configManager.get('providers') : {};
    const providerCfg = (providersConfig && providersConfig[name]) || {};

    const activeModel = configManager ? configManager.get('model') : providerCfg.defaultModel;
    const apiKey = configManager ? configManager.getApiKey(name) : undefined;
    const timeoutMs = configManager ? configManager.get('llmTimeoutMs') : 60000;

    const mergedConfig = {
      ...providerCfg,
      model: activeModel || providerCfg.defaultModel,
      apiKey,
      timeoutMs
    };

    switch (name) {
      case 'groq':
        return new GroqProvider(mergedConfig);
      case 'anthropic':
      case 'claude':
        return new AnthropicProvider(mergedConfig);
      case 'gemini':
      case 'google':
        return new GeminiProvider(mergedConfig);
      case 'ollama':
        return new OllamaProvider(mergedConfig);
      case 'openai':
      case 'deepseek':
      case 'openrouter':
      case 'mistral':
      case 'together':
      case 'lmstudio':
      case 'custom':
      default:
        // OpenAI-compatible architecture handles DeepSeek, OpenRouter, Mistral, Together, Custom API, etc.
        return new OpenAIProvider({
          ...mergedConfig,
          name
        });
    }
  }
}

module.exports = ProviderFactory;
