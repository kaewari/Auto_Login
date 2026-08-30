import * as fs from 'node:fs';
import { getConfig } from './config.js';

export interface CookieItem {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  httpOnly?: boolean | string;
  secure?: boolean | string;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface StorageStateData {
  cookies: CookieItem[];
  origins?: Array<Record<string, unknown>>;
}

export interface AccountItem {
  name: string;
  session: StorageStateData;
  username?: string;
  id?: number;
  displayName?: string;
  balance?: string;
  consumption?: string;
  requests?: number;
}

export function parseAccountData(rawInput: string): AccountItem[] {
  const trimmed = rawInput.trim();
  let parsed: unknown;

  // Thử parse JSON trực tiếp
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Nếu không phải JSON, thử decode Base64
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
      parsed = JSON.parse(decoded);
    } catch (err) {
      throw new Error(`Dữ liệu account không hợp lệ (không phải JSON hoặc Base64 hợp lệ): ${(err as Error).message}`);
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item, idx) => ({
      name: item.name || `Account_${idx + 1}`,
      username: item.username,
      id: item.id,
      displayName: item.displayName || item.display_name,
      balance: item.balance,
      consumption: item.consumption,
      requests: item.requests,
      session: typeof item.session === 'string'
        ? JSON.parse(Buffer.from(item.session, 'base64').toString('utf-8'))
        : item.session,
    }));
  }

  if (parsed && typeof parsed === 'object' && ('cookies' in parsed || 'origins' in parsed)) {
    return [{ name: 'Default_Account', session: parsed as StorageStateData }];
  }

  throw new Error('Định dạng tài khoản không hợp lệ. Cần là StorageState hoặc danh sách AccountItem.');
}

export function loadAccountList(): AccountItem[] {
  const config = getConfig();

  if (config.storageStateBase64) {
    return parseAccountData(config.storageStateBase64);
  }

  if (fs.existsSync(config.accountsFilePath)) {
    const content = fs.readFileSync(config.accountsFilePath, 'utf-8');
    return parseAccountData(content);
  }

  throw new Error(`Không tìm thấy cấu hình tài khoản trong biến môi trường hoặc ${config.accountsFilePath}`);
}
