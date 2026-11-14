'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ConfigManager = require('../src/config/config-manager');
const SkillManager = require('../src/skills/skill-manager');
const ProviderFactory = require('../src/providers/provider-factory');

module.exports = {
  run: async function setupWizardTest() {
    const tmpDir = path.join(os.tmpdir(), `fixen-wizard-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // Test 1: SkillManager autoInstallSkills
      const skillMgr = new SkillManager(tmpDir);
      const targetDir = path.join(tmpDir, 'test-skills');
      const installed = skillMgr.autoInstallSkills(targetDir);

      assert.ok(installed.length >= 7, 'Should install at least 7 skills');
      assert.ok(fs.existsSync(path.join(targetDir, 'ponytail', 'SKILL.md')), 'Ponytail skill should exist');
      assert.ok(fs.existsSync(path.join(targetDir, 'deep-debugger', 'SKILL.md')), 'Deep debugger skill should exist');

      // Verify loaded skills
      const loaded = skillMgr.listSkills();
      assert.ok(loaded.length >= 7, 'All skills should be loaded in skill manager');

      // Test 2: Multi-provider creation via ProviderFactory
      const cfg = new ConfigManager(tmpDir);

      const deepseekProvider = ProviderFactory.create('deepseek', cfg);
      assert.strictEqual(deepseekProvider.name, 'deepseek');
      assert.strictEqual(deepseekProvider.endpoint, 'https://api.deepseek.com');

      const openrouterProvider = ProviderFactory.create('openrouter', cfg);
      assert.strictEqual(openrouterProvider.name, 'openrouter');
      assert.strictEqual(openrouterProvider.endpoint, 'https://openrouter.ai/api/v1');

      const anthropicProvider = ProviderFactory.create('anthropic', cfg);
      assert.strictEqual(anthropicProvider.name, 'anthropic');
      assert.strictEqual(anthropicProvider.endpoint, 'https://api.anthropic.com/v1');

      const customProvider = ProviderFactory.create('custom', cfg);
      assert.strictEqual(customProvider.name, 'custom');
      assert.strictEqual(customProvider.endpoint, 'http://localhost:8000/v1');

      // Test 3: isFirstRun behavior
      cfg.config.hasCompletedSetup = true;
      assert.strictEqual(cfg.isFirstRun(), false, 'Should not be first run if completed');

    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }
};
