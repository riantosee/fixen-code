'use strict';

class PlanningEngine {
  constructor(provider, options = {}) {
    this.provider = provider;
  }

  async createPlan(task, projectSummary) {
    const prompt = [
      'You are the Planning Engine of FIXEN CODE, an autonomous AI software engineering agent.',
      'Analyze the project architecture and the requested user task, then create a clear, step-by-step implementation plan.',
      '',
      projectSummary,
      '',
      `User Task: "${task}"`,
      '',
      'Respond with a JSON object containing:',
      '{',
      '  "objective": "Concise summary of the goal",',
      '  "steps": [',
      '    { "id": 1, "action": "...", "description": "...", "files": ["..."], "verification": "..." }',
      '  ]',
      '}',
      'Output valid JSON only with no surrounding markdown or explanation.'
    ].join('\n');

    try {
      const res = await this.provider.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      });

      let clean = res.content.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(json)?\s*/i, '').replace(/```$/i, '').trim();
      }

      const parsed = JSON.parse(clean);
      return parsed;
    } catch {
      // Fallback deterministic default plan if LLM parsing or connection fails
      return {
        objective: task,
        steps: [
          { id: 1, action: 'inspect', description: 'Inspect project structure and identify relevant files', files: [], verification: 'Files identified' },
          { id: 2, action: 'implement', description: 'Implement changes required for task', files: [], verification: 'Code written' },
          { id: 3, action: 'verify', description: 'Run tests and verify functionality', files: [], verification: 'Tests pass' }
        ]
      };
    }
  }

  formatPlanMarkdown(plan) {
    if (!plan || !plan.steps) return 'No plan generated.';
    const lines = [
      `### Implementation Plan: ${plan.objective || 'Task'}`,
      ''
    ];
    for (const step of plan.steps) {
      lines.push(`${step.id}. **${step.action.toUpperCase()}**: ${step.description}`);
      if (step.files && step.files.length > 0) {
        lines.push(`   - Target files: ${step.files.map((f) => `\`${f}\``).join(', ')}`);
      }
      if (step.verification) {
        lines.push(`   - Verification: ${step.verification}`);
      }
    }
    return lines.join('\n');
  }
}

module.exports = PlanningEngine;
