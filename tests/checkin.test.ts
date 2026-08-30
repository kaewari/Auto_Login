import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAccountData, AccountItem } from '../src/account.js';
import { processAccount } from '../src/agentrouter.js';

describe('Multi-Account parsing tests', () => {
  it('parseAccountData xử lý tương thích ngược single storageState object', () => {
    const single = {
      cookies: [{ name: 'session', value: 'MTcw...' }],
      origins: [],
    };
    const b64 = Buffer.from(JSON.stringify(single)).toString('base64');
    const result = parseAccountData(b64);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Default_Account');
    assert.equal(result[0].session.cookies[0].name, 'session');
  });

  it('parseAccountData giải mã đúng mảng nhiều account', () => {
    const multi: AccountItem[] = [
      {
        name: 'Account_1',
        session: { cookies: [{ name: 'session', value: 's1' }] },
      },
      {
        name: 'Account_2',
        session: { cookies: [{ name: 'session', value: 's2' }] },
      },
    ];
    const b64 = Buffer.from(JSON.stringify(multi)).toString('base64');
    const result = parseAccountData(b64);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'Account_1');
    assert.equal(result[1].name, 'Account_2');
  });

  it('parseAccountData ném lỗi khi Base64 hỏng', () => {
    assert.throws(() => {
      parseAccountData('not-a-valid-base64-json!!!');
    }, /không hợp lệ/);
  });
});

describe('processAccount validation tests', () => {
  it('ném lỗi nếu account không có cookie session', async () => {
    const fakeAccount: AccountItem = {
      name: 'No_Session',
      session: { cookies: [] },
    };
    const fakeBrowser = {} as any;

    await assert.rejects(
      async () => {
        await processAccount(fakeAccount, fakeBrowser);
      },
      /SESSION_MISSING/
    );
  });
});
