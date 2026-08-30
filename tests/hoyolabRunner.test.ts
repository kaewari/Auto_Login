import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runHoyolabCheckin } from '../src/hoyolabCheckin.js';

describe('HoYoLAB Main Runner tests', () => {
  it('runHoyolabCheckin thực thi qua toàn bộ danh sách account và game', async (t) => {
    t.mock.method(global, 'fetch', async (url: string | URL) => {
      return new Response(JSON.stringify({
        retcode: 0,
        message: 'OK',
        data: {
          awards: [{ name: 'Stellar Jade', cnt: 20, icon: 'jade.png' }],
          total_sign_day: 1,
          is_sign: true,
        },
      }), { status: 200 });
    });

    const summaries = await runHoyolabCheckin({
      accounts: [{ name: 'TestAcc', cookie: 'ltuid_v2=1; lttoken_v2=2;' }],
      sendTelegram: false,
    });

    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].results.length, 2); // hkrpg + zzz
    assert.equal(summaries[0].results[0].success, true);
    assert.equal(summaries[0].results[0].todayAward?.name, 'Stellar Jade');
  });
});
