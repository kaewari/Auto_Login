import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { sendTelegramMediaGroup, MediaPhoto } from './notify.js';

// Tự động nạp file .env local nếu có (native Node.js)
if (typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile();
  } catch {}
}

export interface StorageStateData {
  cookies: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  origins?: Array<Record<string, unknown>>;
}

export interface AccountItem {
  name: string;
  session: StorageStateData;
  username?: string;
  id?: number;
}

export interface CheckinResult {
  name: string;
  username: string;
  success: boolean;
  message: string;
  balance?: string;
  screenshot?: Buffer;
}

/**
 * Trích xuất username và ID chính xác từ cookie session của New API
 */
function extractUserFromCookie(cookieVal: string): { username: string; id: number } {
  try {
    const p0 = Buffer.from(cookieVal.split('|')[0], 'base64').toString('utf-8');
    const p0Sub = p0.slice(p0.indexOf('|') + 1);
    const decoded = Buffer.from(p0Sub, 'base64').toString('latin1');
    const match = decoded.match(/github_(\d+)/);
    if (match) {
      return {
        username: match[0],
        id: parseInt(match[1], 10),
      };
    }
  } catch {}
  return { username: 'github_user', id: 1 };
}

export function loadAccounts(): AccountItem[] {
  const envSecret = process.env.ACCOUNTS_STORAGE_BASE64 || process.env.STORAGE_STATE_BASE64;
  if (envSecret) {
    try {
      const decoded = Buffer.from(envSecret.trim(), 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);

      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => ({
          name: item.name || `Account_${idx + 1}`,
          username: item.username,
          id: item.id,
          session: typeof item.session === 'string'
            ? JSON.parse(Buffer.from(item.session, 'base64').toString('utf-8'))
            : item.session,
        }));
      }

      if (parsed && typeof parsed === 'object' && ('cookies' in parsed || 'origins' in parsed)) {
        return [{ name: 'Default_Account', session: parsed as StorageStateData }];
      }

      throw new Error('Định dạng JSON trong secret không hợp lệ (cần là StorageState hoặc mảng Account).');
    } catch (e) {
      throw new Error(`STORAGE_STATE_BASE64 không hợp lệ: ${(e as Error).message}`);
    }
  }

  const accountsPath = path.resolve(process.cwd(), 'accounts.json');
  if (fs.existsSync(accountsPath)) {
    const raw = fs.readFileSync(accountsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  }

  const singlePath = path.resolve(process.cwd(), 'storageState.json');
  if (fs.existsSync(singlePath)) {
    const raw = fs.readFileSync(singlePath, 'utf-8');
    return [{ name: 'Local_Account', session: JSON.parse(raw) }];
  }

  throw new Error('Không tìm thấy session! Cần set STORAGE_STATE_BASE64 hoặc chạy `npm run login`.');
}

async function checkinSingleAccount(
  account: AccountItem,
  browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never
): Promise<CheckinResult> {
  const sessionCookie = account.session.cookies.find((c) => c.name === 'session');
  const cookieVal = sessionCookie?.value || '';
  const parsedUser = extractUserFromCookie(cookieVal);
  const username = account.username || parsedUser.username;
  const userId = account.id || parsedUser.id;

  console.log(`\n[Checkin] >>> Đang xử lý [${account.name}] (Username: ${username}, ID: ${userId})...`);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addCookies(
    account.session.cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || 'agentrouter.org',
      path: c.path || '/',
      httpOnly: typeof c.httpOnly === 'boolean' ? c.httpOnly : String(c.httpOnly) === 'true',
      secure: typeof c.secure === 'boolean' ? c.secure : String(c.secure) === 'true',
      sameSite: c.sameSite === 'Strict' || c.sameSite === 'Lax' || c.sameSite === 'None' ? c.sameSite : 'Lax',
    }))
  );

  const page = await context.newPage();

  // Khởi tạo user object chuẩn cho React SPA frontend
  await page.addInitScript((u) => {
    window.localStorage.setItem(
      'user',
      JSON.stringify({
        id: u.id,
        username: u.username,
        role: 1,
        status: 1,
      })
    );
  }, { id: userId, username });

  let screenshot: Buffer | undefined;

  try {
    // 1. Vào trang console
    await page.goto('https://agentrouter.org/console', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.waitForTimeout(2000);

    // 2. Đóng Modal thông báo hệ thống nếu có
    const closeNoticeBtn = page.locator('button:has-text("Close"), button:has-text("关闭"), button:has-text("今日关闭"), .semi-modal-close');
    if ((await closeNoticeBtn.count()) > 0 && (await closeNoticeBtn.first().isVisible())) {
      await closeNoticeBtn.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // 3. Chuyển sang trang Personal Settings
    const personalLink = page.locator('a[href*="/console/personal"], .semi-navigation-item:has-text("Personal Settings")').first();
    if ((await personalLink.count()) > 0) {
      await personalLink.click();
    } else {
      await page.goto('https://agentrouter.org/console/personal', { waitUntil: 'domcontentloaded' }).catch(() => {});
    }

    await page.waitForSelector('text=Available models', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      return {
        name: account.name,
        username,
        success: false,
        message: 'SESSION_EXPIRED: Cookie session đã hết hạn.',
      };
    }

    // 4. Chụp ảnh màn hình đúng trang Personal Settings
    screenshot = await page.screenshot({ fullPage: false });

    // 5. Lấy số dư và thông tin hiển thị
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const balanceMatch = bodyText.match(/Current balance\s*\n*\s*([$\d,.]+)/i);
    const balance = balanceMatch ? `Số dư: ${balanceMatch[1]}` : undefined;

    return {
      name: account.name,
      username,
      success: true,
      message: 'Đăng nhập & Điểm danh thành công (Active daily session)',
      balance,
      screenshot,
    };
  } catch (error) {
    const err = error as Error;
    try {
      screenshot = await page.screenshot({ fullPage: false });
    } catch {}

    return {
      name: account.name,
      username,
      success: false,
      message: `Lỗi: ${err.message}`,
      screenshot,
    };
  } finally {
    await context.close();
  }
}

async function runMultiCheckin() {
  console.log('=== AGENTROUTER MULTI-ACCOUNT DAILY CHECK-IN ===');
  const accounts = loadAccounts();
  console.log(`[Checkin] Đã tải ${accounts.length} account.`);

  const browser = await chromium.launch({
    headless: true,
  });

  const results: CheckinResult[] = [];

  try {
    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      const res = await checkinSingleAccount(acc, browser);
      results.push(res);
      console.log(`[Checkin - ${acc.name}] Kết quả: ${res.success ? '✅' : '❌'} - ${res.message} ${res.balance ? `(${res.balance})` : ''}`);

      if (i < accounts.length - 1) {
        console.log('[Checkin] Giãn cách 3 giây trước account tiếp theo...');
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  } finally {
    await browser.close();
  }

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  const isAllSuccess = successCount === totalCount;

  const reportLines = [
    `<b>[AgentRouter Daily Multi Check-in]</b>`,
    `📅 ${new Date().toISOString()}`,
    `📊 <b>Tổng kết:</b> ${successCount}/${totalCount} account thành công\n`,
  ];

  results.forEach((r) => {
    const icon = r.success ? '✅' : '❌';
    const balanceStr = r.balance ? ` | 💰 <code>${r.balance}</code>` : '';
    reportLines.push(`👤 <b>${r.name}</b> (<code>${r.username}</code>): ${icon} ${r.message}${balanceStr}`);
  });

  const finalMessage = reportLines.join('\n');

  // Thu thập đầy đủ ảnh chụp của tất cả account
  const photos: MediaPhoto[] = results
    .filter((r) => r.screenshot !== undefined)
    .map((r) => ({
      caption: `👤 <b>${r.name}</b> (<code>${r.username}</code>)\nTrạng thái: ${r.success ? '✅ Thành công' : '❌ Thất bại'}${r.balance ? `\n💰 ${r.balance}` : ''}`,
      buffer: r.screenshot!,
    }));

  await sendTelegramMediaGroup({
    summaryText: finalMessage,
    photos,
  });

  if (!isAllSuccess) {
    console.error(`[Checkin] Có ${totalCount - successCount} account thất bại.`);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('checkin.ts') || process.argv[1]?.endsWith('checkin.js')) {
  runMultiCheckin().catch((err) => {
    console.error('[Checkin Fatal]', err);
    process.exit(1);
  });
}
