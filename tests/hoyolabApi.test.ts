import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CONFIGS } from '../src/hoyolab/config.js';
import { checkinSingleGame, parseSignResponse } from '../src/hoyolab/api.js';

describe('HoYoLAB API Client tests', () => {
  it('parseSignResponse xử lý chính xác cả 3 trường hợp: mới nhận, đã nhận trước đó, và lỗi auth', () => {
    const successRes = { retcode: 0, message: 'OK', data: { code: 'ok' } };
    assert.equal(parseSignResponse(successRes).isSuccess, true);

    const alreadyRes = { retcode: -5003, message: 'Traveler, you have already checked in today~', data: null };
    const parsedAlready = parseSignResponse(alreadyRes);
    assert.equal(parsedAlready.isSuccess, true);
    assert.equal(parsedAlready.alreadySigned, true);

    const errorRes = { retcode: -100, message: 'Not logged in', data: null };
    const parsedErr = parseSignResponse(errorRes);
    assert.equal(parsedErr.isSuccess, false);
    assert.match(parsedErr.message, /Not logged in/);
  });

  it('checkinSingleGame kết hợp lấy danh sách vật phẩm và trả về đúng vật phẩm của ngày điểm danh', async (t) => {
    const mockAwards = [
      { name: 'Adventure Log', cnt: 2, icon: 'log.png' },
      { name: 'Condensed Aether', cnt: 1, icon: 'aether.png' },
      { name: 'Stellar Jade', cnt: 20, icon: 'jade.png' },
    ];

    t.mock.method(global, 'fetch', async (url: string | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('/home')) {
        return new Response(JSON.stringify({
          retcode: 0,
          message: 'OK',
          data: { awards: mockAwards },
        }), { status: 200 });
      }
      if (urlStr.includes('/info')) {
        return new Response(JSON.stringify({
          retcode: 0,
          message: 'OK',
          data: { total_sign_day: 3, is_sign: true },
        }), { status: 200 });
      }
      if (urlStr.includes('/sign')) {
        return new Response(JSON.stringify({
          retcode: 0,
          message: 'OK',
          data: { code: 'ok' },
        }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    });

    const result = await checkinSingleGame(
      { name: 'TestUser', cookie: 'ltuid_v2=123; lttoken_v2=abc;' },
      GAME_CONFIGS.hkrpg
    );

    assert.equal(result.success, true);
    assert.equal(result.totalSignDays, 3);
    assert.ok(result.todayAward);
    assert.equal(result.todayAward?.name, 'Stellar Jade');
    assert.equal(result.todayAward?.cnt, 20);
  });
});
