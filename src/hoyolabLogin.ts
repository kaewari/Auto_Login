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
  console.log('Script đang theo dõi cookie đăng nhập (ltuid_v2 / ltoken_v2 / account_id_v2)...');

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

if (process.argv[1]?.endsWith('hoyolabLogin.ts') || process.argv[1]?.endsWith('hoyolabLogin.js')) {
  main().catch(console.error);
}
