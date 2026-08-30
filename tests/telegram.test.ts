import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAccountCaption, formatSummaryMessage } from '../src/telegram.js';

test('formatAccountCaption generates formatted HTML message for single account', () => {
  const caption = formatAccountCaption({
    name: 'Account_1',
    username: 'github_123',
    displayName: 'Tester',
    userId: 123,
    success: true,
    message: 'Checkin thành công +$25',
    balance: '$310.81',
    consumption: '$0.19',
    requests: 14,
    screenshot: Buffer.from('dummy'),
  });

  assert.match(caption, /Account_1/);
  assert.match(caption, /\$310\.81/);
  assert.match(caption, /✅/);
  assert.match(caption, /github_123/);
});

test('formatSummaryMessage formats total overview correctly', () => {
  const summary = formatSummaryMessage([
    {
      name: 'Account_1',
      username: 'user_1',
      displayName: 'User 1',
      userId: 1,
      success: true,
      message: 'OK',
      balance: '$310.81',
      consumption: '$0.00',
      requests: 0,
      screenshot: Buffer.from('dummy'),
    },
    {
      name: 'Account_2',
      username: 'user_2',
      displayName: 'User 2',
      userId: 2,
      success: true,
      message: 'OK',
      balance: '$275.00',
      consumption: '$0.00',
      requests: 0,
      screenshot: Buffer.from('dummy'),
    },
  ]);

  assert.match(summary, /2\/2/);
  assert.match(summary, /Account_1/);
  assert.match(summary, /Account_2/);
});
