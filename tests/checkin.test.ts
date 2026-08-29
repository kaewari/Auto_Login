import { describe, it } from 'node:test';
import assert from 'node:assert';
import { loadAccounts } from '../src/checkin.js';

describe('Multi-Account Checkin tests', () => {
  it('loadAccounts() xử lý tương thích ngược single storageState object', () => {
    const singleMock = {
      cookies: [{ name: 'single_session', value: '111' }],
      origins: []
    };
    process.env.STORAGE_STATE_BASE64 = Buffer.from(JSON.stringify(singleMock)).toString('base64');

    const accounts = loadAccounts();
    assert.strictEqual(accounts.length, 1);
    assert.strictEqual(accounts[0].name, 'Default_Account');
    assert.strictEqual(accounts[0].session.cookies[0].name, 'single_session');

    delete process.env.STORAGE_STATE_BASE64;
  });

  it('loadAccounts() giải mã đúng mảng nhiều account', () => {
    const multiMock = [
      {
        name: 'Acc1_Main',
        session: { cookies: [{ name: 'acc1', value: 'aaa' }], origins: [] }
      },
      {
        name: 'Acc2_Sub',
        session: { cookies: [{ name: 'acc2', value: 'bbb' }], origins: [] }
      }
    ];
    process.env.STORAGE_STATE_BASE64 = Buffer.from(JSON.stringify(multiMock)).toString('base64');

    const accounts = loadAccounts();
    assert.strictEqual(accounts.length, 2);
    assert.strictEqual(accounts[0].name, 'Acc1_Main');
    assert.strictEqual(accounts[0].session.cookies[0].value, 'aaa');
    assert.strictEqual(accounts[1].name, 'Acc2_Sub');
    assert.strictEqual(accounts[1].session.cookies[0].value, 'bbb');

    delete process.env.STORAGE_STATE_BASE64;
  });

  it('loadAccounts() ném lỗi khi Base64 hỏng', () => {
    process.env.STORAGE_STATE_BASE64 = 'corrupted_base64_data_123';
    assert.throws(() => {
      loadAccounts();
    }, /STORAGE_STATE_BASE64 không hợp lệ/);

    delete process.env.STORAGE_STATE_BASE64;
  });
});
