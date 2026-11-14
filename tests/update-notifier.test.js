'use strict';

const assert = require('assert');
const UpdateNotifier = require('../src/utils/update-notifier');

function run() {
  const notifier = new UpdateNotifier('0.1.0');

  // Semver check
  assert.strictEqual(notifier.isNewer('0.2.0', '0.1.0'), true);
  assert.strictEqual(notifier.isNewer('0.1.1', '0.1.0'), true);
  assert.strictEqual(notifier.isNewer('1.0.0', '0.9.9'), true);
  assert.strictEqual(notifier.isNewer('0.1.0', '0.1.0'), false);
  assert.strictEqual(notifier.isNewer('0.0.9', '0.1.0'), false);

  // Render alert
  const alert = notifier.renderAlert({
    hasUpdate: true,
    current: '0.1.0',
    latest: '0.2.0',
    updateCommand: 'npm install -g fixen-code'
  });

  assert.ok(alert.includes('NEW VERSION AVAILABLE'));
  assert.ok(alert.includes('0.1.0'));
  assert.ok(alert.includes('0.2.0'));
  assert.ok(alert.includes('npm install -g fixen-code'));

  return { name: 'update-notifier.test.js', passed: true };
}

module.exports = { run };
