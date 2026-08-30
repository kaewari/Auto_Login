import { AccountCheckinSummary, GameCheckinResult } from './types.js';

export function formatGameCaption(accountName: string, res: GameCheckinResult): string {
  const icon = res.success ? '✅' : '❌';
  const awardStr = res.todayAward
    ? `🎁 <b>${res.todayAward.name}</b> x${res.todayAward.cnt}`
    : '🎁 Không rõ vật phẩm';

  return [
    `👤 <b>Tài khoản:</b> <code>${accountName}</code>`,
    `🎮 <b>${res.gameName}</b>: ${icon}`,
    `• Trạng thái: <i>${res.statusMessage}</i>`,
    `• Tổng ngày điểm danh: <b>${res.totalSignDays} ngày</b>`,
    `• Quà hôm nay: ${awardStr}`,
    `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (ICT)`,
  ].join('\n');
}

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

  let sentAnyPhoto = false;

  for (const acc of summaries) {
    for (const res of acc.results) {
      const caption = formatGameCaption(acc.accountName, res);

      // Nếu có icon vật phẩm, gửi dạng sendPhoto
      if (res.todayAward?.icon) {
        try {
          const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              photo: res.todayAward.icon,
              caption: caption,
              parse_mode: 'HTML',
            }),
          });

          const data = (await photoRes.json()) as { ok: boolean; description?: string };
          if (data.ok) {
            sentAnyPhoto = true;
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          } else {
            console.error(`[Hoyolab Telegram] Lỗi gửi ảnh cho [${res.gameName}]:`, data.description);
          }
        } catch (err) {
          console.error(`[Hoyolab Telegram] Lỗi gửi ảnh:`, (err as Error).message);
        }
      }

      // Fallback: Gửi dạng text thuần nếu không có ảnh hoặc lỗi gửi ảnh
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: caption,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        });
        await new Promise((r) => setTimeout(r, 1000));
      } catch {}
    }
  }

  return true;
}
