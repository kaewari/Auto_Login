import * as path from 'node:path';

if (typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile();
  } catch {}
}

export interface AppConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  storageStateBase64?: string;
  accountsFilePath: string;
  screenshotsDir: string;
  targetPersonalUrl: string;
  delayBetweenAccountsMs: number;
}

export function getConfig(): AppConfig {
  return {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    storageStateBase64: process.env.STORAGE_STATE_BASE64 || process.env.ACCOUNTS_STORAGE_BASE64 || '',
    accountsFilePath: path.resolve(process.cwd(), 'accounts.json'),
    screenshotsDir: path.resolve(process.cwd(), 'screenshots'),
    targetPersonalUrl: 'https://agentrouter.org/console/personal',
    delayBetweenAccountsMs: 3000,
  };
}
