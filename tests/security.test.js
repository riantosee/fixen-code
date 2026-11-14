'use strict';

const assert = require('assert');
const path = require('path');
const os = require('os');
const PathGuard = require('../src/security/path-guard');
const { maskSecrets, hasSecrets } = require('../src/security/secret-guard');
const { PermissionManager, PERMISSION_LEVELS } = require('../src/security/permissions');

function run() {
  const dummyWorkspace = path.join(os.tmpdir(), 'fixen-sec-test-' + Date.now());
  const guard = new PathGuard(dummyWorkspace);

  // 1. Path Traversal Protection
  assert.throws(() => {
    guard.resolvePath('../outside.txt');
  }, /Security Violation/i, 'Should reject parent directory traversal');

  assert.throws(() => {
    guard.resolvePath('../../etc/passwd');
  }, /Security Violation/i, 'Should reject multi-level traversal');

  // Valid path inside workspace
  const validPath = guard.resolvePath('src/utils/file.js');
  assert.ok(validPath.startsWith(dummyWorkspace), 'Valid path should resolve within workspace');

  // 2. Sensitive File Detection
  assert.strictEqual(guard.isSensitive('.env'), true, '.env must be sensitive');
  assert.strictEqual(guard.isSensitive('config/.env.local'), true, '.env.local must be sensitive');
  assert.strictEqual(guard.isSensitive('keys/id_rsa'), true, 'id_rsa must be sensitive');
  assert.strictEqual(guard.isSensitive('certs/server.pem'), true, '.pem must be sensitive');
  assert.strictEqual(guard.isSensitive('auth/credentials.json'), true, 'credentials.json must be sensitive');
  assert.strictEqual(guard.isSensitive('src/app.js'), false, 'regular source file is not sensitive');

  // 3. Secret Masking
  const textWithKeys = 'Using Groq key gsk_1234567890abcdef123456 and OpenAI key sk-abcdef1234567890123456';
  assert.strictEqual(hasSecrets(textWithKeys), true);
  const masked = maskSecrets(textWithKeys);
  assert.ok(!masked.includes('gsk_1234567890abcdef123456'), 'Groq key must be masked');
  assert.ok(masked.includes('[REDACTED_GROQ_KEY]'), 'Groq key label present');
  assert.ok(!masked.includes('sk-abcdef1234567890123456'), 'OpenAI key must be masked');
  assert.ok(masked.includes('[REDACTED_OPENAI_KEY]'), 'OpenAI key label present');

  // 4. Permission Levels
  const pmReadOnly = new PermissionManager(PERMISSION_LEVELS.READ_ONLY);
  assert.strictEqual(pmReadOnly.canRead(), true);
  assert.strictEqual(pmReadOnly.canWriteFiles(), false);
  assert.strictEqual(pmReadOnly.canExecuteCommands(), false);
  assert.throws(() => {
    pmReadOnly.shouldPromptForFile('write', 'test.js');
  }, /Permission denied/);

  const pmControlled = new PermissionManager(PERMISSION_LEVELS.CONTROLLED_AUTO);
  assert.strictEqual(pmControlled.shouldPromptForFile('edit', 'src/code.js', false), false, 'Normal edit should not prompt in Controlled Auto');
  assert.strictEqual(pmControlled.shouldPromptForFile('delete', 'src/code.js', false), true, 'Deletion should prompt in Controlled Auto');
  assert.strictEqual(pmControlled.shouldPromptForFile('write', '.env', true), true, 'Sensitive file must prompt in Controlled Auto');
  assert.strictEqual(pmControlled.shouldPromptForCommand('npm test', false), false, 'Safe test command should not prompt in Controlled Auto');
  assert.strictEqual(pmControlled.shouldPromptForCommand('rm -rf node_modules', true), true, 'Dangerous command must prompt in Controlled Auto');

  const pmFull = new PermissionManager(PERMISSION_LEVELS.FULL_AUTO);
  assert.strictEqual(pmFull.shouldPromptForCommand('rm -rf temp', false), false, 'Full auto skips prompt');

  return { name: 'security.test.js', passed: true };
}

module.exports = { run };
