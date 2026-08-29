export interface MediaPhoto {
  caption?: string;
  buffer: Buffer;
}

export interface MultiNotificationPayload {
  token?: string;
  chatId?: string;
  summaryText: string;
  photos: MediaPhoto[];
}

export async function sendTelegramMediaGroup(payload: MultiNotificationPayload): Promise<boolean> {
  const token = payload.token || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = payload.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('[Notify] Telegram config not set. Skipping notification.');
    return false;
  }

  console.log(`[Notify] Đang gửi thông báo Telegram cho ${payload.photos.length} account...`);

  try {
    // Gửi lần lượt từng account: 1 tin nhắn + 1 ảnh duy nhất kèm báo cáo
    if (payload.photos.length > 0) {
      for (let i = 0; i < payload.photos.length; i++) {
        const item = payload.photos[i];
        const caption = item.caption || payload.summaryText;

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
        formData.append(
          'photo',
          new Blob([new Uint8Array(item.buffer)], { type: 'image/png' }),
          'screenshot.png'
        );

        const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          console.error(`[Notify] Gửi ảnh account ${i + 1} lỗi:`, await res.text());
        }

        if (i < payload.photos.length - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      console.log('[Notify] Đã gửi thông báo Telegram thành công!');
      return true;
    }

    // Fallback: Gửi tin nhắn text thuần nếu không có ảnh
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.summaryText,
        parse_mode: 'HTML',
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('[Notify] Error sending Telegram message:', err);
    return false;
  }
}
