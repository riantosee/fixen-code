'use strict';

const colors = require('./colors');

class PipelineTracker {
  constructor() {
    this.stages = ['INSPECT', 'PLAN', 'EXECUTE', 'VERIFY'];
    this.currentStageIndex = 0;
  }

  setStage(stageName) {
    const idx = this.stages.findIndex((s) => stageName.toUpperCase().includes(s));
    if (idx !== -1) {
      this.currentStageIndex = idx;
    }
  }

  renderPipeline() {
    const rendered = this.stages.map((stage, idx) => {
      if (idx < this.currentStageIndex) {
        return colors.green(`✔ ${stage}`);
      } else if (idx === this.currentStageIndex) {
        return colors.cyan(colors.bold(`▶ ${stage}`));
      } else {
        return colors.dim(`○ ${stage}`);
      }
    });

    return `  [PIPELINE] ` + rendered.join(colors.dim(' ── '));
  }

  static renderStepHeader(stepNumber, totalSteps, title, description = '') {
    const badge = colors.badge(`${stepNumber}/${totalSteps}`, 'cyan');
    const header = `${badge} ${colors.bold(title)}`;
    if (description) {
      return `${header}\n  ${colors.dim(description)}`;
    }
    return header;
  }

  static renderToolEvent(type, toolName, details = '') {
    if (type === 'start') {
      return `  ${colors.cyan('⚙')} ${colors.bold(toolName)} ${colors.dim(details.slice(0, 100))}`;
    } else if (type === 'success') {
      return `  ${colors.green('✔')} ${colors.gray(toolName + ' completed')}`;
    } else {
      return `  ${colors.red('✖')} ${colors.red(toolName + ' failed: ' + details)}`;
    }
  }
}

module.exports = PipelineTracker;
