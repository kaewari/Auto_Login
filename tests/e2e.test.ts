import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAccountList } from '../src/account.js';
import { formatAccountCaption, formatSummaryMessage } from '../src/telegram.js';

test('E2E validation: loads real accounts and formats payload properly', () => {
  const accounts = loadAccountList();
  assert.equal(accounts.length >= 2, true);

  const mockResult = {
    name: accounts[0].name,
    username: 'github_474137',
    displayName: 'kaewari',
    userId: 474137,
    success: true,
    message: 'Checkin thành công +$25',
    balance: '$310.81',
    consumption: '$0.19',
    requests: 14,
    screenshot: Buffer.from('mock-png'),
  };

  const caption = formatAccountCaption(mockResult);
  assert.match(caption, /Account_1/);
  assert.match(caption, /kaewari/);
  assert.match(caption, /\$310\.81/);

  const summary = formatSummaryMessage([mockResult]);
  assert.match(summary, /12:00 PM/);
});
