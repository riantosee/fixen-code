'use strict';

const readline = require('readline');
const colors = require('./colors');
const { formatColorDiff } = require('../utils/diff');

class UI {
  static createInterface() {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  static async prompt(questionText) {
    const rl = UI.createInterface();
    return new Promise((resolve) => {
      rl.question(questionText, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  static async confirm(questionText, defaultYes = true) {
    const hint = defaultYes ? '(Y/n)' : '(y/N)';
    const ans = await UI.prompt(`${questionText} ${colors.dim(hint)} `);
    if (!ans) return defaultYes;
    return ans.toLowerCase().startsWith('y');
  }

  static async confirmDiff({ operation, path: targetPath, diff, isSensitive }) {
    console.log('\n' + colors.badge(operation.toUpperCase(), operation === 'delete' ? 'red' : 'yellow') + ` File: ${colors.bold(targetPath)}`);
    if (isSensitive) {
      console.log(colors.warn('Warning: This is a sensitive or protected file!'));
    }

    if (diff && diff !== 'No changes detected.') {
      console.log('\n' + formatColorDiff(diff) + '\n');
    }

    return UI.confirm(`Approve ${operation} on ${targetPath}?`, true);
  }

  static async confirmCommand({ command, isDangerous, permissionLevel }) {
    console.log('\n' + colors.badge('COMMAND', isDangerous ? 'red' : 'yellow') + ` ${colors.bold(command)}`);
    if (isDangerous) {
      console.log(colors.warn('CRITICAL WARNING: This command matches a dangerous pattern!'));
    }
    return UI.confirm('Execute this command?', !isDangerous);
  }

  static spinner(message) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let idx = 0;
    const isTTY = Boolean(process.stdout && process.stdout.isTTY);

    if (!isTTY) {
      process.stdout.write(`${message}...\n`);
      return {
        stop: () => {}
      };
    }

    const timer = setInterval(() => {
      process.stdout.write(`\r${colors.cyan(frames[idx])} ${message}`);
      idx = (idx + 1) % frames.length;
    }, 80);

    return {
      stop: (finalText = '') => {
        clearInterval(timer);
        process.stdout.write('\r\x1b[K');
        if (finalText) {
          process.stdout.write(`${finalText}\n`);
        }
      }
    };
  }
}

module.exports = UI;
