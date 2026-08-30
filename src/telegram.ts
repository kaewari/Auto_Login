import { AccountResult } from './agentrouter.js';

export function formatAccountCaption(res: AccountResult): string {
  const icon = res.success ? '✅' : '❌';
  const displayStr = res.displayName && res.displayName !== res.username ? ` (${res.displayName})` : '';

  return [
    `👤 <b>${res.name}</b> (<code>${res.username}</code>${displayStr})`,
    `🆔 User ID: <code>${res.userId}</code>`,
    `📊 Trạng thái: ${icon} ${res.message}`,
    `💰 Số dư hiện tại: <b>${res.balance}</b>`,
    `📉 Đã sử dụng: <code>${res.consumption}</code> (Số request: ${res.requests})`,
    `🔗 Trang cá nhân: <code>https://agentrouter.org/console/personal</code>`,
  ].join('\n');
}

export function formatSummaryMessage(results: AccountResult[]): string {
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  const lines = [
    `🤖 <b>[AgentRouter 12:00 PM Daily Check-in]</b>`,
    `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (ICT)`,
    `📊 <b>Tổng kết:</b> ${successCount}/${totalCount} account hoàn thành\n`,
  ];

  results.forEach((r) => {
    const icon = r.success ? '✅' : '❌';
    lines.push(`• <b>${r.name}</b> (<code>${r.username}</code>): ${icon} <b>${r.balance}</b>`);
  });

  return lines.join('\n');
}

export async function sendAccountPhoto(
  result: AccountResult,
  token: string,
  chatId: string
): Promise<boolean> {
  if (!token || !chatId) {
    console.warn(`[Telegram] Bỏ qua gửi ảnh [${result.name}] vì thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID.`);
    return false;
  }

  const caption = formatAccountCaption(result);
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  const blob = new Blob([result.screenshot], { type: 'image/png' });
  formData.append('photo', blob, `${result.name}_personal.png`);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) {
      console.error(`[Telegram] Lỗi khi gửi ảnh cho [${result.name}]:`, data.description);
      return false;
    }

    console.log(`[Telegram] Đã gửi ảnh & thông tin thành công cho [${result.name}].`);
    return true;
  } catch (err) {
    console.error(`[Telegram] Lỗi mạng khi gửi Telegram cho [${result.name}]:`, err);
    return false;
  }
}

export async function sendTelegramTextMessage(
  text: string,
  token: string,
  chatId: string
): Promise<boolean> {
  if (!token || !chatId) {
    return false;
  }

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

    const data = await res.json() as { ok: boolean; description?: string };
    return data.ok;
  } catch {
    return false;
  }
}
