'use strict';

const SECRET_PATTERNS = [
  // Groq API Key
  { regex: /gsk_[a-zA-Z0-9_-]{20,}/g, label: '[REDACTED_GROQ_KEY]' },
  // OpenAI API Key
  { regex: /sk-[a-zA-Z0-9_-]{20,}/g, label: '[REDACTED_OPENAI_KEY]' },
  // GitHub token
  { regex: /gh[pousr]_[a-zA-Z0-9]{36,}/g, label: '[REDACTED_GITHUB_TOKEN]' },
  // JWT
  { regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, label: '[REDACTED_JWT]' },
  // Generic password/token assignments
  { regex: /(api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*["']?([a-zA-Z0-9_.-]{16,})["']?/gi, label: '$1: [REDACTED_SECRET]' }
];

function maskSecrets(text) {
  if (typeof text !== 'string') return text;
  let masked = text;
  for (const { regex, label } of SECRET_PATTERNS) {
    masked = masked.replace(regex, label);
  }
  return masked;
}

function hasSecrets(text) {
  if (typeof text !== 'string') return false;
  return SECRET_PATTERNS.some(({ regex }) => {
    regex.lastIndex = 0;
    return regex.test(text);
  });
}

module.exports = {
  maskSecrets,
  hasSecrets,
  SECRET_PATTERNS
};
