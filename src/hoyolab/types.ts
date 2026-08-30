export interface AwardItem {
  name: string;
  cnt: number;
  icon: string;
}

export interface GameCheckinConfig {
  gameKey: 'hkrpg' | 'zzz';
  gameName: string;
  actId: string;
  homeUrl: string;
  signUrl: string;
  infoUrl: string;
  signgameHeader?: string;
}

export interface HoyolabAccount {
  name: string;
  cookie: string;
  games?: Array<'hkrpg' | 'zzz'>;
}

export interface GameCheckinResult {
  gameKey: 'hkrpg' | 'zzz';
  gameName: string;
  success: boolean;
  statusMessage: string;
  totalSignDays: number;
  todayAward?: AwardItem;
  rawResponse?: Record<string, unknown>;
}

export interface AccountCheckinSummary {
  accountName: string;
  results: GameCheckinResult[];
}
