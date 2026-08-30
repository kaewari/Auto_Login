import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseHoyolabAccounts, GAME_CONFIGS } from '../src/hoyolab/config.js';

describe('HoYoLAB Config & Parser tests', () => {
  it('GAME_CONFIGS chứa cấu hình cho cả hkrpg (Star Rail) và zzz (Zenless Zone Zero)', () => {
    assert.ok(GAME_CONFIGS.hkrpg);
    assert.equal(GAME_CONFIGS.hkrpg.actId, 'e202303301540311');
    assert.ok(GAME_CONFIGS.zzz);
    assert.equal(GAME_CONFIGS.zzz.actId, 'e202406031448091');
  });

  it('parseHoyolabAccounts giải mã đúng JSON hoặc Base64 chứa danh sách cookie', () => {
    const raw = [
      {
        name: 'Main_Hoyolab',
        cookie: 'ltuid_v2=12345; lttoken_v2=abcde; ltoken_v2=xyz;',
      },
    ];
    const b64 = Buffer.from(JSON.stringify(raw)).toString('base64');
    const parsed = parseHoyolabAccounts(b64);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].name, 'Main_Hoyolab');
    assert.match(parsed[0].cookie, /ltuid_v2/);
  });
});
