import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from '../src/config.js';

test('getConfig returns default values when env is empty', () => {
  const originalEnv = { ...process.env };
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.STORAGE_STATE_BASE64;

  const config = getConfig();
  assert.equal(config.targetPersonalUrl, 'https://agentrouter.org/console/personal');
  assert.equal(config.screenshotsDir.endsWith('screenshots'), true);
  assert.equal(config.delayBetweenAccountsMs, 3000);

  process.env = originalEnv;
});
