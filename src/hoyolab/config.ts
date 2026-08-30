import { GameCheckinConfig, HoyolabAccount } from './types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const GAME_CONFIGS: Record<'hkrpg' | 'zzz', GameCheckinConfig> = {
  hkrpg: {
    gameKey: 'hkrpg',
    gameName: 'Honkai: Star Rail',
    actId: 'e202303301540311',
    homeUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/home',
    signUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/sign',
    infoUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/info',
  },
  zzz: {
    gameKey: 'zzz',
    gameName: 'Zenless Zone Zero',
    actId: 'e202406031448091',
    homeUrl: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/home',
    signUrl: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign',
    infoUrl: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info',
    signgameHeader: 'zzz',
  },
};

export function parseHoyolabAccounts(rawInput: string): HoyolabAccount[] {
  const trimmed = rawInput.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
      parsed = JSON.parse(decoded);
    } catch (err) {
      throw new Error(`Dữ liệu HoYoLAB accounts không hợp lệ: ${(err as Error).message}`);
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item, idx) => ({
      name: item.name || `Hoyolab_Account_${idx + 1}`,
      cookie: typeof item.cookie === 'string' ? item.cookie : '',
      games: item.games || ['hkrpg', 'zzz'],
    }));
  }

  if (parsed && typeof parsed === 'object' && 'cookie' in parsed) {
    const obj = parsed as { name?: string; cookie: string; games?: Array<'hkrpg' | 'zzz'> };
    return [{
      name: obj.name || 'Hoyolab_Account_1',
      cookie: obj.cookie,
      games: obj.games || ['hkrpg', 'zzz'],
    }];
  }

  throw new Error('Định dạng tài khoản HoYoLAB không hợp lệ.');
}

export function loadHoyolabAccounts(): HoyolabAccount[] {
  const envB64 = process.env.HOYOLAB_ACCOUNTS_BASE64 || process.env.HOYOLAB_COOKIE;
  if (envB64) {
    const trimmed = envB64.trim();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      if (trimmed.includes('ltuid') || trimmed.includes('account_id') || trimmed.includes('ltoken')) {
        return [{ name: 'Default_Hoyolab', cookie: trimmed, games: ['hkrpg', 'zzz'] }];
      }
    }
    return parseHoyolabAccounts(trimmed);
  }

  const filePath = path.resolve(process.cwd(), 'hoyolab_accounts.json');
  if (fs.existsSync(filePath)) {
    return parseHoyolabAccounts(fs.readFileSync(filePath, 'utf-8'));
  }

  return [];
}
