import { getLang } from '@/i18n';
import type { MapId } from '@/types';

/** 一个赛季的天数：从 1 月 1 日到 12 月 31 日。 */
export const SEASON_DAYS = 365;

/** 提前几天截止报名。 */
export const REGISTRATION_LEAD_DAYS = 5;

export interface SeasonEvent {
  id: string;
  tier: number;
  name: string;
  /** 英文名（渲染处 pick(name, nameEn)）。 */
  nameEn: string;
  /** 比赛日（1-365）。 */
  day: number;
  /** 报名截止日（比赛日之前）。 */
  closeDay: number;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 把 1-365 的天数换成 3月14日（英文 Mar 14）这样的日期。 */
export function monthDayLabel(day: number): string {
  const clamped = Math.max(1, Math.min(SEASON_DAYS, Math.round(day)));
  const en = getLang() === 'en';
  let rest = clamped;
  for (let m = 0; m < MONTH_DAYS.length; m += 1) {
    if (rest <= MONTH_DAYS[m]) return en ? MONTH_EN[m] + ' ' + rest : m + 1 + '月' + rest + '日';
    rest -= MONTH_DAYS[m];
  }
  return en ? 'Dec 31' : '12月31日';
}

const SCHEDULE: { tier: number; day: number }[] = [
  { tier: 0, day: 20 }, { tier: 0, day: 95 }, { tier: 0, day: 175 }, { tier: 0, day: 260 },
  { tier: 1, day: 45 }, { tier: 1, day: 130 }, { tier: 1, day: 215 }, { tier: 1, day: 305 },
  { tier: 2, day: 70 }, { tier: 2, day: 160 }, { tier: 2, day: 250 },
  { tier: 3, day: 110 }, { tier: 3, day: 230 }, { tier: 3, day: 320 },
  { tier: 4, day: 150 }, { tier: 4, day: 290 },
  // 撞车的日子：同一天两站不同级别的赛事，必须二选一
  { tier: 1, day: 70 }, { tier: 3, day: 160 }, { tier: 0, day: 250 }, { tier: 2, day: 320 },
];

const TIER_NAME: Record<number, string> = {
  0: '业余联赛', 1: '区域联赛', 2: '挑战者联赛', 3: '国际邀请赛', 4: '特级锦标赛',
};

const TIER_NAME_EN: Record<number, string> = {
  0: 'Amateur League', 1: 'Regional League', 2: 'Challenger League', 3: 'International Invitational', 4: 'Premier Championship',
};

/** 一个赛季的赛程：日期固定，必须先报名再等比赛日。 */
export function seasonEvents(season: number): SeasonEvent[] {
  return SCHEDULE.map((item, index) => {
    const round = SCHEDULE.filter((x) => x.tier === item.tier).findIndex((x) => x.day === item.day) + 1;
    return {
      id: 's' + season + '-e' + index,
      tier: item.tier,
      name: (TIER_NAME[item.tier] ?? '联赛') + ' · 第 ' + round + ' 站',
      nameEn: (TIER_NAME_EN[item.tier] ?? 'League') + ' · Stop ' + round,
      day: item.day,
      closeDay: item.day - REGISTRATION_LEAD_DAYS,
    };
  }).sort((a, b) => a.day - b.day);
}

/** 当前赛季中还没打完的赛事（含正在进行报名/等待开赛的）。 */
export function upcomingEvents(season: number, day: number): SeasonEvent[] {
  return seasonEvents(season).filter((e) => e.day >= day);
}

export function nextEventFor(tier: number, season: number, day: number): SeasonEvent | null {
  return seasonEvents(season).find((e) => e.tier === tier && e.day >= day) ?? null;
}

/** 这站赛事会出现的队伍（确定性抽取，报名前就能看到）。 */
export function eventField(event: SeasonEvent, pool: { id: string; name: string }[], size: number): string[] {
  let seed = 0;
  for (let i = 0; i < event.id.length; i += 1) seed = (seed * 33 + event.id.charCodeAt(i)) >>> 0;
  const list = [...pool];
  for (let i = list.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list.slice(0, size).map((t) => t.name);
}

export function eventMapId(event: SeasonEvent): MapId {
  const list: MapId[] = ['Mirage', 'Inferno', 'Nuke'];
  return list[(event.tier + event.day) % list.length];
}