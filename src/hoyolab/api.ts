import { GameCheckinConfig, HoyolabAccount, AwardItem, GameCheckinResult } from './types.js';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function buildHeaders(config: GameCheckinConfig, cookie: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': DEFAULT_USER_AGENT,
    'Referer': 'https://act.hoyolab.com/',
    'Origin': 'https://act.hoyolab.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cookie': cookie,
    'x-rpc-app_version': '2.34.1',
    'x-rpc-client_type': '5',
  };

  if (config.signgameHeader) {
    headers['x-rpc-signgame'] = config.signgameHeader;
  }

  return headers;
}

export function parseSignResponse(json: any): { isSuccess: boolean; alreadySigned: boolean; message: string } {
  if (!json) {
    return { isSuccess: false, alreadySigned: false, message: 'Phản hồi rỗng từ máy chủ' };
  }
  if (json.retcode === 0) {
    return { isSuccess: true, alreadySigned: false, message: 'Điểm danh thành công!' };
  }
  if (json.retcode === -5003 || (typeof json.message === 'string' && json.message.toLowerCase().includes('already checked in'))) {
    return { isSuccess: true, alreadySigned: true, message: 'Hôm nay đã điểm danh trước đó.' };
  }
  return { isSuccess: false, alreadySigned: false, message: json.message || `Lỗi retcode: ${json.retcode}` };
}

export async function fetchAwardsList(config: GameCheckinConfig, cookie: string): Promise<AwardItem[]> {
  const url = `${config.homeUrl}?act_id=${config.actId}&lang=en-us`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(config, cookie),
  });

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} khi lấy danh sách phần thưởng`);
  }

  const json = (await res.json()) as any;
  if (json.retcode !== 0 || !json.data || !Array.isArray(json.data.awards)) {
    throw new Error(json.message || 'Không thể lấy danh sách phần thưởng');
  }

  return json.data.awards.map((a: any) => ({
    name: a.name,
    cnt: a.cnt,
    icon: a.icon,
  }));
}

export async function fetchSignInfo(
  config: GameCheckinConfig,
  cookie: string
): Promise<{ totalSignDay: number; isSign: boolean }> {
  const url = `${config.infoUrl}?act_id=${config.actId}&lang=en-us`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(config, cookie),
  });

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} khi lấy thông tin điểm danh`);
  }

  const json = (await res.json()) as any;
  if (json.retcode !== 0 || !json.data) {
    throw new Error(json.message || 'Không thể lấy thông tin điểm danh');
  }

  return {
    totalSignDay: json.data.total_sign_day || 0,
    isSign: Boolean(json.data.is_sign),
  };
}

export async function executeSign(
  config: GameCheckinConfig,
  cookie: string
): Promise<{ isSuccess: boolean; alreadySigned: boolean; message: string; raw: any }> {
  const url = `${config.signUrl}?lang=en-us`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildHeaders(config, cookie),
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({ act_id: config.actId }),
  });

  if (!res.ok) {
    return {
      isSuccess: false,
      alreadySigned: false,
      message: `HTTP error ${res.status}`,
      raw: null,
    };
  }

  const json = (await res.json()) as any;
  const parsed = parseSignResponse(json);
  return { ...parsed, raw: json };
}

export async function checkinSingleGame(
  account: HoyolabAccount,
  config: GameCheckinConfig
): Promise<GameCheckinResult> {
  try {
    const awards = await fetchAwardsList(config, account.cookie).catch(() => []);
    const signResult = await executeSign(config, account.cookie);
    const info = await fetchSignInfo(config, account.cookie).catch(() => ({
      totalSignDay: 0,
      isSign: true,
    }));

    let totalDays = info.totalSignDay;
    if (signResult.isSuccess && !signResult.alreadySigned && totalDays === 0) {
      totalDays = 1;
    }

    const todayAward = awards.length >= totalDays && totalDays > 0 ? awards[totalDays - 1] : undefined;

    return {
      gameKey: config.gameKey,
      gameName: config.gameName,
      success: signResult.isSuccess,
      statusMessage: signResult.message,
      totalSignDays: totalDays,
      todayAward,
      rawResponse: signResult.raw,
    };
  } catch (error) {
    return {
      gameKey: config.gameKey,
      gameName: config.gameName,
      success: false,
      statusMessage: (error as Error).message || 'Unknown error',
      totalSignDays: 0,
    };
  }
}
