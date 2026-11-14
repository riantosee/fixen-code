'use strict';

const assert = require('assert');
const path = require('path');
const SkillManager = require('../src/skills/skill-manager');

function run() {
  const sm = new SkillManager(path.resolve(__dirname, '..'));

  const skills = sm.listSkills();
  assert.ok(skills.length >= 7, 'Should have all 7 engineering skills installed');

  const expectedSkills = [
    'ponytail',
    'deep-debugger',
    'motion-design',
    'security-auditor',
    'test-driven-architect',
    'refactoring-master',
    'api-designer'
  ];

  for (const name of expectedSkills) {
    const s = sm.getSkill(name);
    assert.ok(s !== null, `Skill '${name}' must be loaded`);
    assert.ok(s.instructions.length > 50, `Skill '${name}' must have detailed instructions`);
  }

  const ponytail = sm.getSkill('ponytail');
  assert.ok(ponytail !== null, 'Ponytail skill must be loaded');
  assert.ok(ponytail.instructions.includes('Shortest Working Diff'));
  assert.ok(ponytail.instructions.includes('Strict YAGNI'));

  const prompt = sm.getSkillsPrompt();
  assert.ok(prompt.includes('Skill: ponytail'));
  assert.ok(prompt.includes('ACTIVE ENGINEERING SKILLS'));

  // Test disable/enable
  sm.disableSkill('ponytail');
  const promptWithoutPonytail = sm.getSkillsPrompt();
  assert.ok(!promptWithoutPonytail.includes('Skill: ponytail'));

  sm.enableSkill('ponytail');
  const promptWithPonytail = sm.getSkillsPrompt();
  assert.ok(promptWithPonytail.includes('Skill: ponytail'));

  return { name: 'skills.test.js', passed: true };
}

module.exports = { run };
