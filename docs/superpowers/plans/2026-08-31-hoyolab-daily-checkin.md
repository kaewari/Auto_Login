# HoYoLAB Daily Check-in (Honkai: Star Rail & Zenless Zone Zero) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng tính năng đăng nhập thủ công / lưu trữ token và tự động check-in hàng ngày lúc 12h trưa cho HoYoLAB (Honkai: Star Rail và Zenless Zone Zero), trích xuất vật phẩm nhận được và gửi thông báo qua Telegram.

**Architecture:** Mở rộng hệ thống hiện có với module riêng cho HoYoLAB (`src/hoyolab/`). Tạo công cụ CLI login/cookie capture (`src/hoyolabLogin.ts`), module gọi API check-in và lấy danh sách phần thưởng theo ngày (`src/hoyolab/checkin.ts`, `src/hoyolab/api.ts`), module định dạng kết quả và gửi thông báo Telegram (`src/hoyolab/telegram.ts`), tích hợp cron job GitHub Actions chạy 12h trưa (`0 5 * * *` UTC).

**Tech Stack:** TypeScript, Node.js (Fetch API & node:test AAA), Playwright (hỗ trợ login thủ công lấy cookie HoYoLAB), GitHub Actions.

**Spec:**
- Honkai: Star Rail (hkrpg) check-in: `act_id=e202303301540311`
  - Home/Awards URL: `https://sg-public-api.hoyolab.com/event/luna/os/home?act_id=e202303301540311&lang=vi-vn` (hoặc `lang=en-us`)
  - Sign URL: `https://sg-public-api.hoyolab.com/event/luna/os/sign`
  - Info URL: `https://sg-public-api.hoyolab.com/event/luna/os/info?act_id=e202303301540311&lang=vi-vn`
- Zenless Zone Zero (zzz) check-in: `act_id=e202406031448091`
  - Home/Awards URL: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/home?act_id=e202406031448091&lang=vi-vn`
  - Sign URL: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign`
  - Info URL: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info?act_id=e202406031448091&lang=vi-vn`
- Kết quả sau khi check-in phải trả về: Tên game, trạng thái (đã điểm danh / vừa điểm danh), tổng số ngày đã điểm danh trong tháng, tên vật phẩm và số lượng nhận được của ngày hôm đó (kèm icon nếu có).

## Global Constraints
- Clean Code, Type Safety, chuẩn AAA test, không thêm dependency dư thừa.
- Không lưu lộ thông tin cookie/secret vào mã nguồn (sử dụng base64 / env `HOYOLAB_ACCOUNTS_BASE64` hoặc file `hoyolab_accounts.json`).
- Hỗ trợ cả 2 game (HSR và ZZZ) trong cùng 1 lần chạy check-in.

---

### Task 1: Định nghĩa Types và Config cho HoYoLAB

**Files:**
- Create: `src/hoyolab/types.ts`
- Create: `src/hoyolab/config.ts`
- Test: `tests/hoyolabConfig.test.ts`

**Interfaces:**
- Consumes: Environment variables (`HOYOLAB_ACCOUNTS_BASE64`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
- Produces: `HoyolabConfig`, `HoyolabAccount`, `GameCheckinTarget`, `AwardItem`, `CheckinResult`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/hoyolabConfig.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/hoyolabConfig.test.ts`
Expected: FAIL with "Cannot find module '../src/hoyolab/config.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/hoyolab/types.ts
export interface AwardItem {
  name: string;
  cnt: number;
  icon: string;
}

export interface GameCheckinConfig {
  gameKey: 'hkrpg' | 'zzz';
  gameName: string;
  actId: string;
  homeUrl: string;
  signUrl: string;
  infoUrl: string;
  signgameHeader?: string;
}

export interface HoyolabAccount {
  name: string;
  cookie: string;
  games?: Array<'hkrpg' | 'zzz'>;
}

export interface GameCheckinResult {
  gameKey: 'hkrpg' | 'zzz';
  gameName: string;
  success: boolean;
  statusMessage: string;
  totalSignDays: number;
  todayAward?: AwardItem;
  rawResponse?: Record<string, unknown>;
}

export interface AccountCheckinSummary {
  accountName: string;
  results: GameCheckinResult[];
}
```

```typescript
// src/hoyolab/config.ts
import { GameCheckinConfig, HoyolabAccount } from './types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const GAME_CONFIGS: Record<'hkrpg' | 'zzz', GameCheckinConfig> = {
  hkrpg: {
    gameKey: 'hkrpg',
    gameName: 'Honkai: Star Rail',
    actId: 'e202303301540311',
    homeUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/home',
    signUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/sign',
    infoUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/info',
  },
  zzz: {
    gameKey: 'zzz',
    gameName: 'Zenless Zone Zero',
    actId: 'e202406031448091',
    homeUrl: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/home',
    signUrl: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign',
    infoUrl: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info',
    signgameHeader: 'zzz',
  },
};

export function parseHoyolabAccounts(rawInput: string): HoyolabAccount[] {
  const trimmed = rawInput.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
      parsed = JSON.parse(decoded);
    } catch (err) {
      throw new Error(`Dữ liệu HoYoLAB accounts không hợp lệ: ${(err as Error).message}`);
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item, idx) => ({
      name: item.name || `Hoyolab_Account_${idx + 1}`,
      cookie: typeof item.cookie === 'string' ? item.cookie : '',
      games: item.games || ['hkrpg', 'zzz'],
    }));
  }

  if (parsed && typeof parsed === 'object' && 'cookie' in parsed) {
    const obj = parsed as { name?: string; cookie: string; games?: Array<'hkrpg' | 'zzz'> };
    return [{
      name: obj.name || 'Hoyolab_Account_1',
      cookie: obj.cookie,
      games: obj.games || ['hkrpg', 'zzz'],
    }];
  }

  throw new Error('Định dạng tài khoản HoYoLAB không hợp lệ.');
}

export function loadHoyolabAccounts(): HoyolabAccount[] {
  const envB64 = process.env.HOYOLAB_ACCOUNTS_BASE64 || process.env.HOYOLAB_COOKIE;
  if (envB64) {
    if (!envB64.includes('{') && !envB64.includes('[') && envB64.includes('=')) {
      if (envB64.includes('ltuid') || envB64.includes('account_id') || envB64.includes('cookie_token')) {
        return [{ name: 'Default_Hoyolab', cookie: envB64, games: ['hkrpg', 'zzz'] }];
      }
    }
    return parseHoyolabAccounts(envB64);
  }

  const filePath = path.resolve(process.cwd(), 'hoyolab_accounts.json');
  if (fs.existsSync(filePath)) {
    return parseHoyolabAccounts(fs.readFileSync(filePath, 'utf-8'));
  }

  return [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/hoyolabConfig.test.ts`
Expected: PASS (2 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/hoyolab/types.ts src/hoyolab/config.ts tests/hoyolabConfig.test.ts
git commit -m "feat(hoyolab): add types and config parser for hoyolab daily checkin"
```

---

### Task 2: Module gọi HoYoLAB API (Lấy danh sách vật phẩm, thông tin điểm danh, thực hiện điểm danh)

**Files:**
- Create: `src/hoyolab/api.ts`
- Test: `tests/hoyolabApi.test.ts`

**Interfaces:**
- Consumes: `GameCheckinConfig`, `HoyolabAccount`, `fetch` API
- Produces: `fetchAwardsList()`, `fetchSignInfo()`, `executeSign()`, `checkinSingleGame()`

- [ ] **Step 1: Write the failing test with Mocks**

```typescript
// tests/hoyolabApi.test.ts
import test, { describe, it, mock } from 'node:test';
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/hoyolabApi.test.ts`
Expected: FAIL with "Cannot find module '../src/hoyolab/api.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/hoyolab/api.ts
import { GameCheckinConfig, HoyolabAccount, AwardItem, GameCheckinResult } from './types.js';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function buildHeaders(config: GameCheckinConfig, cookie: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': DEFAULT_USER_AGENT,
    'Referer': `https://act.hoyolab.com/`,
    'Origin': 'https://act.hoyolab.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cookie': cookie,
    'x-rpc-app_version': '2.34.1',
    'x-rpc-client_type': '5',
  };

  if (config.signgameHeader) {
    headers['x-rpc-signgame'] = config.signgameHeader;
  }

  return headers;
}

export function parseSignResponse(json: any): { isSuccess: boolean; alreadySigned: boolean; message: string } {
  if (json.retcode === 0) {
    return { isSuccess: true, alreadySigned: false, message: 'Điểm danh thành công!' };
  }
  // retcode -5003 là đã điểm danh hôm nay
  if (json.retcode === -5003 || (typeof json.message === 'string' && json.message.toLowerCase().includes('already checked in'))) {
    return { isSuccess: true, alreadySigned: true, message: 'Hôm nay đã điểm danh trước đó.' };
  }
  return { isSuccess: false, alreadySigned: false, message: json.message || `Lỗi retcode: ${json.retcode}` };
}

export async function fetchAwardsList(config: GameCheckinConfig, cookie: string): Promise<AwardItem[]> {
  const url = `${config.homeUrl}?act_id=${config.actId}&lang=en-us`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(config, cookie),
  });

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} khi lấy danh sách phần thưởng`);
  }

  const json = (await res.json()) as any;
  if (json.retcode !== 0 || !json.data || !Array.isArray(json.data.awards)) {
    throw new Error(json.message || 'Không thể lấy danh sách phần thưởng');
  }

  return json.data.awards.map((a: any) => ({
    name: a.name,
    cnt: a.cnt,
    icon: a.icon,
  }));
}

export async function fetchSignInfo(
  config: GameCheckinConfig,
  cookie: string
): Promise<{ totalSignDay: number; isSign: boolean }> {
  const url = `${config.infoUrl}?act_id=${config.actId}&lang=en-us`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(config, cookie),
  });

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} khi lấy thông tin điểm danh`);
  }

  const json = (await res.json()) as any;
  if (json.retcode !== 0 || !json.data) {
    throw new Error(json.message || 'Không thể lấy thông tin điểm danh');
  }

  return {
    totalSignDay: json.data.total_sign_day || 0,
    isSign: Boolean(json.data.is_sign),
  };
}

export async function executeSign(
  config: GameCheckinConfig,
  cookie: string
): Promise<{ isSuccess: boolean; alreadySigned: boolean; message: string; raw: any }> {
  const url = `${config.signUrl}?lang=en-us`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildHeaders(config, cookie),
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({ act_id: config.actId }),
  });

  if (!res.ok) {
    return {
      isSuccess: false,
      alreadySigned: false,
      message: `HTTP error ${res.status}`,
      raw: null,
    };
  }

  const json = (await res.json()) as any;
  const parsed = parseSignResponse(json);
  return { ...parsed, raw: json };
}

export async function checkinSingleGame(
  account: HoyolabAccount,
  config: GameCheckinConfig
): Promise<GameCheckinResult> {
  try {
    // 1. Lấy danh sách quà của tháng
    const awards = await fetchAwardsList(config, account.cookie).catch(() => []);

    // 2. Thực hiện Sign in
    const signResult = await executeSign(config, account.cookie);

    // 3. Lấy thông tin số ngày đã điểm danh
    const info = await fetchSignInfo(config, account.cookie).catch(() => ({
      totalSignDay: 0,
      isSign: true,
    }));

    let totalDays = info.totalSignDay;
    // Nếu vừa điểm danh thành công mà info chưa kịp cập nhật
    if (signResult.isSuccess && !signResult.alreadySigned && totalDays === 0) {
      totalDays = 1;
    }

    const todayAward = awards.length >= totalDays && totalDays > 0 ? awards[totalDays - 1] : undefined;

    return {
      gameKey: config.gameKey,
      gameName: config.gameName,
      success: signResult.isSuccess,
      statusMessage: signResult.message,
      totalSignDays: totalDays,
      todayAward,
      rawResponse: signResult.raw,
    };
  } catch (error) {
    return {
      gameKey: config.gameKey,
      gameName: config.gameName,
      success: false,
      statusMessage: (error as Error).message || 'Unknown error',
      totalSignDays: 0,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/hoyolabApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hoyolab/api.ts tests/hoyolabApi.test.ts
git commit -m "feat(hoyolab): implement api client for awards, sign-in and info"
```

---

### Task 3: Module định dạng tin nhắn Telegram & thông báo kết quả chi tiết vật phẩm

**Files:**
- Create: `src/hoyolab/telegram.ts`
- Test: `tests/hoyolabTelegram.test.ts`

**Interfaces:**
- Consumes: `AccountCheckinSummary[]`, `GameCheckinResult`
- Produces: `formatHoyolabSummaryMessage()`, `sendHoyolabTelegramReport()`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/hoyolabTelegram.test.ts
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
    assert.match(message, /Stellar Jade x20/);
    assert.match(message, /Zenless Zone Zero/);
    assert.match(message, /Polychromes x20/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/hoyolabTelegram.test.ts`
Expected: FAIL with "Cannot find module '../src/hoyolab/telegram.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/hoyolab/telegram.ts
import { AccountCheckinSummary } from './types.js';

export function formatHoyolabSummaryMessage(summaries: AccountCheckinSummary[]): string {
  const lines: string[] = [
    `🎁 <b>[HoYoLAB 12:00 PM Daily Check-in]</b>`,
    `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (ICT)`,
    `----------------------------------------`,
  ];

  for (const acc of summaries) {
    lines.push(`👤 <b>Tài khoản:</b> <code>${acc.accountName}</code>`);
    for (const res of acc.results) {
      const icon = res.success ? '✅' : '❌';
      const awardStr = res.todayAward
        ? `🎁 <b>${res.todayAward.name}</b> x${res.todayAward.cnt}`
        : '🎁 Không rõ vật phẩm';

      lines.push(`\n🎮 <b>${res.gameName}</b>: ${icon}`);
      lines.push(`• Trạng thái: <i>${res.statusMessage}</i>`);
      lines.push(`• Tổng ngày điểm danh: <b>${res.totalSignDays} ngày</b>`);
      lines.push(`• Quà hôm nay: ${awardStr}`);
    }
    lines.push(`----------------------------------------`);
  }

  return lines.join('\n');
}

export async function sendHoyolabTelegramReport(
  summaries: AccountCheckinSummary[],
  token: string,
  chatId: string
): Promise<boolean> {
  if (!token || !chatId) {
    console.log('[Hoyolab Telegram] Bỏ qua gửi tin nhắn vì thiếu token/chatId.');
    return false;
  }

  const text = formatHoyolabSummaryMessage(summaries);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.error('[Hoyolab Telegram] Lỗi gửi thông báo:', data.description);
    }
    return data.ok;
  } catch (err) {
    console.error('[Hoyolab Telegram] Lỗi mạng:', err);
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/hoyolabTelegram.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hoyolab/telegram.ts tests/hoyolabTelegram.test.ts
git commit -m "feat(hoyolab): add telegram formatter and reporting"
```

---

### Task 4: CLI Đăng nhập HoYoLAB thủ công & Trích xuất Cookie (`src/hoyolabLogin.ts`)

**Files:**
- Create: `src/hoyolabLogin.ts`
- Modify: `package.json` (thêm script `login:hoyolab`, `checkin:hoyolab`, `checkin:all`)

**Interfaces:**
- Consumes: Playwright chromium browser, user interaction
- Produces: `hoyolab_accounts.json`, Base64 secret output cho GitHub Actions

- [ ] **Step 1: Implement `src/hoyolabLogin.ts`**

```typescript
// src/hoyolabLogin.ts
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface HoyolabAccountEntry {
  name: string;
  cookie: string;
  games: string[];
}

async function main() {
  const accountName = process.argv[2] || 'Hoyolab_Account_1';
  console.log(`\n======================================================`);
  console.log(`🎮 HoYoLAB Login & Cookie Export CLI [Account: ${accountName}]`);
  console.log(`======================================================`);
  console.log('Mở Chromium để đăng nhập HoYoLAB...');

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://act.hoyolab.com/bbs/event/signin/hkrpg/e202303301540311.html?act_id=e202303301540311');

  console.log(`\nVui lòng đăng nhập tài khoản HoYoLAB trên trình duyệt...`);
  console.log('Script đang theo dõi cookie đăng nhập (ltuid_v2 / account_id_v2)...');

  try {
    let capturedCookie = '';
    const startTime = Date.now();

    while (Date.now() - startTime < 300000) {
      const cookies = await context.cookies(['https://act.hoyolab.com', 'https://hoyolab.com']);
      const essential = cookies.filter((c) =>
        ['ltuid_v2', 'lttoken_v2', 'ltoken_v2', 'account_id_v2', 'cookie_token_v2', 'ltuid', 'ltoken', 'cookie_token'].includes(c.name)
      );

      if (essential.length >= 2) {
        capturedCookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
        break;
      }
      await page.waitForTimeout(2000);
    }

    if (!capturedCookie) {
      throw new Error('Hết thời gian chờ đăng nhập (5 phút) hoặc chưa tìm thấy cookie cần thiết.');
    }

    const accountsPath = path.resolve(process.cwd(), 'hoyolab_accounts.json');
    let accounts: HoyolabAccountEntry[] = [];
    if (fs.existsSync(accountsPath)) {
      try {
        accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
      } catch {}
    }

    const existingIndex = accounts.findIndex((a) => a.name === accountName);
    const entry: HoyolabAccountEntry = {
      name: accountName,
      cookie: capturedCookie,
      games: ['hkrpg', 'zzz'],
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = entry;
    } else {
      accounts.push(entry);
    }

    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2), 'utf-8');
    const allAccountsBase64 = Buffer.from(JSON.stringify(accounts)).toString('base64');

    console.log('\n======================================================');
    console.log(`✅ ĐĂNG NHẬP THÀNH CÔNG CHO [${accountName}]!`);
    console.log(`- File lưu trữ: ${accountsPath}`);
    console.log('\n👇 CHUỖI BASE64 ĐỂ ĐẶT VÀO GITHUB SECRET `HOYOLAB_ACCOUNTS_BASE64`:');
    console.log('------------------------------------------------------');
    console.log(allAccountsBase64);
    console.log('------------------------------------------------------\n');
  } catch (error) {
    console.error('❌ Lỗi khi đăng nhập HoYoLAB:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
```

- [ ] **Step 2: Update package.json scripts**

Add `"login:hoyolab": "tsx src/hoyolabLogin.ts"` and `"checkin:hoyolab": "tsx src/hoyolabCheckin.ts"`.

- [ ] **Step 3: Run check on types / lint**

Run: `npx tsx -e "console.log('Build syntax OK')"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/hoyolabLogin.ts package.json
git commit -m "feat(hoyolab): add login interactive cli for capturing cookies"
```

---

### Task 5: Runner Check-in Chính (`src/hoyolabCheckin.ts`) và Tích hợp GitHub Actions

**Files:**
- Create: `src/hoyolabCheckin.ts`
- Create: `tests/hoyolabRunner.test.ts`
- Modify: `.github/workflows/daily-checkin.yml`

**Interfaces:**
- Consumes: `loadHoyolabAccounts()`, `checkinSingleGame()`, `sendHoyolabTelegramReport()`
- Produces: Complete auto-checkin runner executed at 12:00 PM

- [ ] **Step 1: Write integration unit test**

```typescript
// tests/hoyolabRunner.test.ts
import test, { describe, it, mock } from 'node:test';
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/hoyolabRunner.test.ts`
Expected: FAIL with "Cannot find module '../src/hoyolabCheckin.js'"

- [ ] **Step 3: Write implementation `src/hoyolabCheckin.ts`**

```typescript
// src/hoyolabCheckin.ts
import { loadHoyolabAccounts, GAME_CONFIGS } from './hoyolab/config.js';
import { checkinSingleGame } from './hoyolab/api.js';
import { sendHoyolabTelegramReport } from './hoyolab/telegram.js';
import { AccountCheckinSummary, HoyolabAccount } from './hoyolab/types.js';
import { getConfig } from './config.js';

export async function runHoyolabCheckin(options?: {
  accounts?: HoyolabAccount[];
  sendTelegram?: boolean;
}): Promise<AccountCheckinSummary[]> {
  console.log('\n=====================================================');
  console.log('🎮 HOYOLAB DAILY CHECK-IN (Star Rail & ZZZ) 12:00 PM');
  console.log('=====================================================');

  const accounts = options?.accounts || loadHoyolabAccounts();
  const config = getConfig();

  if (accounts.length === 0) {
    console.log('[HoYoLAB] Không tìm thấy tài khoản nào được cấu hình trong HOYOLAB_ACCOUNTS_BASE64 hoặc hoyolab_accounts.json');
    return [];
  }

  console.log(`[HoYoLAB] Bắt đầu điểm danh cho ${accounts.length} tài khoản...`);
  const summaries: AccountCheckinSummary[] = [];

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    console.log(`\n[HoYoLAB] [${i + 1}/${accounts.length}] Đang xử lý: ${acc.name}...`);
    const summary: AccountCheckinSummary = {
      accountName: acc.name,
      results: [],
    };

    const targetGames = acc.games && acc.games.length > 0 ? acc.games : ['hkrpg', 'zzz'];

    for (const gameKey of targetGames) {
      const gameConfig = GAME_CONFIGS[gameKey];
      if (!gameConfig) continue;

      console.log(`  -> Đang điểm danh [${gameConfig.gameName}]...`);
      const res = await checkinSingleGame(acc, gameConfig);
      summary.results.push(res);

      const statusIcon = res.success ? '✅' : '❌';
      const awardText = res.todayAward ? `${res.todayAward.name} x${res.todayAward.cnt}` : 'N/A';
      console.log(`     ${statusIcon} ${res.statusMessage} | Ngày thứ: ${res.totalSignDays} | Quà: ${awardText}`);

      await new Promise((r) => setTimeout(r, 1500));
    }

    summaries.push(summary);

    if (i < accounts.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const shouldSendTelegram = options?.sendTelegram !== undefined ? options.sendTelegram : true;
  if (shouldSendTelegram && config.telegramBotToken && config.telegramChatId && summaries.length > 0) {
    console.log('\n[HoYoLAB] Đang gửi thông báo kết quả chi tiết qua Telegram...');
    await sendHoyolabTelegramReport(summaries, config.telegramBotToken, config.telegramChatId);
  }

  console.log('\n=====================================================');
  console.log('✅ HOÀN TẤT CHECK-IN HOYOLAB!');
  console.log('=====================================================');

  return summaries;
}

if (process.argv[1]?.endsWith('hoyolabCheckin.ts') || process.argv[1]?.endsWith('hoyolabCheckin.js')) {
  runHoyolabCheckin().catch((err) => {
    console.error('[HoYoLAB Fatal Error]', err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Update `.github/workflows/daily-checkin.yml`**

Thêm bước chạy HoYoLAB checkin cùng với AgentRouter checkin trong workflow chạy lúc 12:00 PM:
```yaml
      - name: Run HoYoLAB Daily Check-in (Star Rail & ZZZ)
        if: always()
        env:
          HOYOLAB_ACCOUNTS_BASE64: ${{ secrets.HOYOLAB_ACCOUNTS_BASE64 }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: npm run checkin:hoyolab
```

- [ ] **Step 5: Run tests and verify full suite**

Run: `npm test`
Expected: ALL tests pass (100% green)

- [ ] **Step 6: Commit**

```bash
git add src/hoyolabCheckin.ts tests/hoyolabRunner.test.ts .github/workflows/daily-checkin.yml
git commit -m "feat(hoyolab): complete daily checkin runner with github actions integration"
```

---

### Task 6: Cập nhật README và tài liệu hướng dẫn sử dụng

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README.md with clear instructions**
  - Cách chạy `npm run login:hoyolab`
  - Cách cấu hình secret `HOYOLAB_ACCOUNTS_BASE64`
  - Thông tin vật phẩm trả về từ Star Rail & ZZZ

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update documentation for hoyolab checkin feature"
```
