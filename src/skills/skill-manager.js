'use strict';

const fs = require('fs');
const path = require('path');

class SkillManager {
  constructor(workspace = process.cwd()) {
    this.workspace = path.resolve(workspace);
    this.projectSkillsDir = path.join(this.workspace, 'skills');
    this.localSkillsDir = path.join(this.workspace, '.fixen', 'skills');
    this.skills = new Map();
    this.enabledSkills = new Set();
    this.init();
  }

  init() {
    this.loadAll();
  }

  parseSkillFile(filePath) {
    if (!fs.existsSync(filePath)) return null;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let name = path.basename(path.dirname(filePath));
      let description = '';
      let instructions = content;

      // Parse YAML frontmatter if present
      if (content.startsWith('---')) {
        const parts = content.split('---');
        if (parts.length >= 3) {
          const yaml = parts[1].trim();
          instructions = parts.slice(2).join('---').trim();

          const nameMatch = yaml.match(/^name:\s*(.+)$/m);
          if (nameMatch) name = nameMatch[1].trim();

          const descMatch = yaml.match(/^description:\s*(.+)$/m);
          if (descMatch) description = descMatch[1].trim();
        }
      }

      return {
        name,
        description,
        instructions,
        filePath
      };
    } catch {
      return null;
    }
  }

  loadDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillFile = path.join(dirPath, entry.name, 'SKILL.md');
          if (fs.existsSync(skillFile)) {
            const skill = this.parseSkillFile(skillFile);
            if (skill) {
              this.skills.set(skill.name, skill);
              this.enabledSkills.add(skill.name); // Enabled by default
            }
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const skill = this.parseSkillFile(path.join(dirPath, entry.name));
          if (skill) {
            this.skills.set(skill.name, skill);
            this.enabledSkills.add(skill.name);
          }
        }
      }
    } catch {}
  }

  loadAll() {
    this.skills.clear();
    this.loadDirectory(this.projectSkillsDir);
    this.loadDirectory(this.localSkillsDir);
  }

  enableSkill(name) {
    if (this.skills.has(name)) {
      this.enabledSkills.add(name);
      return true;
    }
    return false;
  }

  disableSkill(name) {
    return this.enabledSkills.delete(name);
  }

  getSkill(name) {
    return this.skills.get(name);
  }

  listSkills() {
    return Array.from(this.skills.values()).map((s) => ({
      name: s.name,
      description: s.description,
      enabled: this.enabledSkills.has(s.name),
      path: s.filePath
    }));
  }

  getSkillsPrompt() {
    const active = [];
    for (const name of this.enabledSkills) {
      const skill = this.skills.get(name);
      if (skill) {
        active.push(`### Skill: ${skill.name}\n${skill.description ? `*${skill.description}*\n\n` : ''}${skill.instructions}`);
      }
    }

    if (active.length === 0) return '';

    return [
      '## ACTIVE ENGINEERING SKILLS & RULES:',
      'Follow these specialized engineering skills strictly during planning, execution, and verification:',
      '',
      active.join('\n\n---\n\n')
    ].join('\n');
  }
}

module.exports = SkillManager;
