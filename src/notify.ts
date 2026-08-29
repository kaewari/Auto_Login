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

  console.log(`[Notify] Đang gửi thông báo Telegram kèm ${payload.photos.length} ảnh...`);

  try {
    if (payload.photos.length > 1) {
      // Gửi Album nhiều ảnh (sendMediaGroup)
      const formData = new FormData();
      formData.append('chat_id', chatId);

      const media = payload.photos.map((item, index) => {
        const attachName = `photo_${index}`;
        formData.append(
          attachName,
          new Blob([new Uint8Array(item.buffer)], { type: 'image/png' }),
          `${attachName}.png`
        );

        return {
          type: 'photo',
          media: `attach://${attachName}`,
          caption: index === 0 ? payload.summaryText : item.caption || '',
          parse_mode: 'HTML',
        };
      });

      formData.append('media', JSON.stringify(media));

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        console.log('[Notify] Đã gửi MediaGroup Telegram thành công!');
        return true;
      }

      console.error('[Notify] sendMediaGroup failed:', await res.text());
    } else if (payload.photos.length === 1) {
      // Gửi 1 ảnh đơn (sendPhoto)
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('caption', payload.summaryText);
      formData.append('parse_mode', 'HTML');
      formData.append(
        'photo',
        new Blob([new Uint8Array(payload.photos[0].buffer)], { type: 'image/png' }),
        'screenshot.png'
      );

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        console.log('[Notify] Đã gửi sendPhoto Telegram thành công!');
        return true;
      }

      console.error('[Notify] sendPhoto failed:', await res.text());
    }

    // Fallback: Gửi tin nhắn text thuần nếu gửi ảnh lỗi hoặc không có ảnh
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.summaryText,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      console.error('[Notify] sendMessage failed:', await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Notify] Error sending Telegram message:', err);
    return false;
  }
}
