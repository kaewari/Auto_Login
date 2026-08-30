import { loadHoyolabAccounts, GAME_CONFIGS } from './hoyolab/config.js';
import { checkinSingleGame } from './hoyolab/api.js';
import { sendHoyolabTelegramReport } from './hoyolab/telegram.js';
import { AccountCheckinSummary, HoyolabAccount } from './hoyolab/types.js';
import { getConfig } from './config.js';

export async function runHoyolabCheckin(options?: {
  accounts?: HoyolabAccount[];
  sendTelegram?: boolean;
}): Promise<AccountCheckinSummary[]> {
  console.log('=====================================================');
  console.log('🎮 HOYOLAB DAILY CHECK-IN (Star Rail & ZZZ) 12:00 PM');
  console.log('=====================================================');

  const accounts = options?.accounts || loadHoyolabAccounts();
  const config = getConfig();

  if (accounts.length === 0) {
    console.log('[HoYoLAB] Không tìm thấy tài khoản nào trong HOYOLAB_ACCOUNTS_BASE64 hoặc hoyolab_accounts.json');
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

      await new Promise((r) => setTimeout(r, 1000));
    }

    summaries.push(summary);

    if (i < accounts.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
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
