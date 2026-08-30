import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatHoyolabSummaryMessage } from '../src/hoyolab/telegram.js';
import { AccountCheckinSummary } from '../src/hoyolab/types.js';

describe('HoYoLAB Telegram formatter tests', () => {
  it('định dạng đầy đủ thông tin tên game, số ngày và vật phẩm nhận được', () => {
    const mockSummary: AccountCheckinSummary[] = [
      {
        accountName: 'Account_1',
        results: [
          {
            gameKey: 'hkrpg',
            gameName: 'Honkai: Star Rail',
            success: true,
            statusMessage: 'Điểm danh thành công!',
            totalSignDays: 5,
            todayAward: {
              name: 'Stellar Jade',
              cnt: 20,
              icon: 'https://example.com/jade.png',
            },
          },
          {
            gameKey: 'zzz',
            gameName: 'Zenless Zone Zero',
            success: true,
            statusMessage: 'Hôm nay đã điểm danh trước đó.',
            totalSignDays: 5,
            todayAward: {
              name: 'Polychromes',
              cnt: 20,
              icon: 'https://example.com/poly.png',
            },
          },
        ],
      },
    ];

    const message = formatHoyolabSummaryMessage(mockSummary);
    assert.match(message, /HoYoLAB 12:00 PM Daily Check-in/);
    assert.match(message, /Account_1/);
    assert.match(message, /Honkai: Star Rail/);
    assert.match(message, /Stellar Jade/);
    assert.match(message, /Zenless Zone Zero/);
    assert.match(message, /Polychromes/);
  });
});
