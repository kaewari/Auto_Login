import { chromium } from 'playwright';
import { getConfig } from './config.js';
import { loadAccountList } from './account.js';
import { processAccount, AccountResult } from './agentrouter.js';
import { sendAccountPhoto, sendTelegramTextMessage, formatSummaryMessage } from './telegram.js';

export async function run() {
  console.log('=====================================================');
  console.log('🤖 AGENTROUTER 12:00 PM DAILY AUTO CHECK-IN & SCREENSHOT');
  console.log('=====================================================');

  const config = getConfig();
  const accounts = loadAccountList();
  console.log(`[Main] Đã nạp thành công ${accounts.length} tài khoản.`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-size=1440,900',
    ],
  });

  const results: AccountResult[] = [];

  try {
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      console.log(`\n[Main] [${i + 1}/${accounts.length}] Đang xử lý: ${account.name}...`);

      try {
        const result = await processAccount(account, browser);
        results.push(result);

        console.log(`[Main] [${account.name}] Thành công: ${result.balance} | Ảnh: ${result.screenshotPath}`);

        // Gửi ảnh chụp màn hình kèm thông tin chi tiết riêng biệt của tài khoản này
        if (config.telegramBotToken && config.telegramChatId) {
          console.log(`[Main] Gửi báo cáo Telegram cho [${account.name}]...`);
          await sendAccountPhoto(result, config.telegramBotToken, config.telegramChatId);
        }
      } catch (accErr) {
        console.error(`[Main] Lỗi khi xử lý account [${account.name}]:`, (accErr as Error).message);
      }

      // Giãn cách an toàn giữa các tài khoản
      if (i < accounts.length - 1) {
        console.log(`[Main] Nghỉ ${config.delayBetweenAccountsMs / 1000}s trước tài khoản tiếp theo...`);
        await new Promise((resolve) => setTimeout(resolve, config.delayBetweenAccountsMs));
      }
    }
  } finally {
    await browser.close();
  }

  // Gửi tin nhắn tổng kết sau khi hoàn thành tất cả
  if (config.telegramBotToken && config.telegramChatId && results.length > 0) {
    const summaryText = formatSummaryMessage(results);
    await sendTelegramTextMessage(summaryText, config.telegramBotToken, config.telegramChatId);
    console.log('[Main] Đã gửi thông báo tổng kết hoàn tất.');
  }

  console.log('\n=====================================================');
  console.log(`✅ HOÀN TẤT CHECK-IN: ${results.filter((r) => r.success).length}/${accounts.length} ACCOUNT THÀNH CÔNG.`);
  console.log('=====================================================');
}

if (process.argv[1]?.endsWith('main.ts') || process.argv[1]?.endsWith('main.js') || process.argv[1]?.endsWith('checkin.ts')) {
  run().catch((err) => {
    console.error('[Fatal Error]', err);
    process.exit(1);
  });
}
