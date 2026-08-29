import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface AccountEntry {
  name: string;
  session: Record<string, unknown>;
}

async function main() {
  const accountName = process.argv[2] || 'Default_Account';
  console.log(`--- AgentRouter Login & Session Export CLI [Account: ${accountName}] ---`);
  console.log('Mở Chromium để đăng nhập thủ công qua GitHub...');

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://agentrouter.org/login');

  console.log(`\nVui lòng thực hiện đăng nhập GitHub cho account [${accountName}] trên trình duyệt...`);
  console.log('Script đang chờ chuyển hướng tới trang Dashboard (/console)...');

  try {
    await page.waitForURL(/.*agentrouter\.org\/console.*/, { timeout: 180000 });
    await page.waitForLoadState('networkidle');

    // Lưu file storageState riêng cho account
    const safeName = accountName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageStatePath = path.resolve(process.cwd(), `storageState_${safeName}.json`);
    await context.storageState({ path: storageStatePath });

    const sessionObj = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));

    // Cập nhật vào danh sách accounts.json cục bộ
    const accountsPath = path.resolve(process.cwd(), 'accounts.json');
    let accounts: AccountEntry[] = [];
    if (fs.existsSync(accountsPath)) {
      try {
        accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
      } catch {}
    }

    const existingIndex = accounts.findIndex((acc) => acc.name === accountName);
    if (existingIndex >= 0) {
      accounts[existingIndex].session = sessionObj;
    } else {
      accounts.push({ name: accountName, session: sessionObj });
    }

    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2), 'utf-8');

    // Tạo chuỗi base64 của toàn bộ danh sách accounts
    const allAccountsBase64 = Buffer.from(JSON.stringify(accounts)).toString('base64');
    const singleAccountBase64 = Buffer.from(JSON.stringify(sessionObj)).toString('base64');

    console.log('\n======================================================');
    console.log(`✅ ĐĂNG NHẬP THÀNH CÔNG CHO [${accountName}]!`);
    console.log(`- File session local: ${storageStatePath}`);
    console.log(`- File tổng hợp accounts: ${accountsPath} (Tổng: ${accounts.length} account)`);
    console.log('\n👇 CHUỖI BASE64 TỔNG HỢP (TẤT CẢ ACCOUNTS) ĐỂ ĐẶT VÀO GITHUB SECRET `STORAGE_STATE_BASE64`:');
    console.log('------------------------------------------------------');
    console.log(allAccountsBase64);
    console.log('------------------------------------------------------');
    console.log('\n(Hoặc nếu chỉ dùng 1 account này):');
    console.log(singleAccountBase64);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Hết thời gian chờ đăng nhập hoặc xảy ra lỗi:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
