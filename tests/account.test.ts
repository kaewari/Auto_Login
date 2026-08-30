import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAccountData } from '../src/account.js';

test('parseAccountData handles base64 encoded account list', () => {
  const rawAccounts = [
    {
      name: 'Account_1',
      session: {
        cookies: [{ name: 'session', value: 'dummy-session' }],
      },
    },
  ];
  const b64 = Buffer.from(JSON.stringify(rawAccounts)).toString('base64');
  const accounts = parseAccountData(b64);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].name, 'Account_1');
  assert.equal(accounts[0].session.cookies[0].value, 'dummy-session');
});

test('parseAccountData handles raw JSON string', () => {
  const rawAccounts = [
    {
      name: 'Account_2',
      session: {
        cookies: [{ name: 'session', value: 'cookie-2' }],
      },
    },
  ];
  const accounts = parseAccountData(JSON.stringify(rawAccounts));
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].name, 'Account_2');
});
