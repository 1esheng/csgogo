import { PLAYERS, TEMPLATE_MAP } from '@/data/cards';

/**
 * 「传奇选手」标签：独立于稀有度，是长期征战履历的荣誉标记。
 *
 * 判定口径（用户定稿）：出道年份 since <= LEGEND_DEBUT_CUTOFF（2015）即为传奇。
 * 用固定截止年而不是「当前年 - 15」，避免每到新年整份名单自动漂移。
 *
 * 名录只收录 src/data/cards.ts 中真实存在的选手（key = 卡池的 playerId，也就是
 * templateId `tpl-<playerId>-<season>` 的中间段）。since 取公开可查的职业生涯起点
 * （Liquipedia 选手页 Infobox 的 years_active，与 HLTV 上的生涯起点共识一致），
 * 拿不准的一律不收——宁缺勿错。
 */
export const LEGEND_DEBUT_CUTOFF = 2015;

/** 传奇标识的暖金：只用于发丝线与文字，不做渐变/发光。 */
export const LEGEND_GOLD = '#D8B26A';

export interface LegendEntry {
  /** 出道年份（有公开记录的职业生涯起点）。 */
  since: number;
  note?: string;
}

export const LEGEND_PLAYERS: Record<string, LegendEntry> = {
  acor: { since: 2015 },
  adren: { since: 2005 },
  advent: { since: 2013 },
  allu: { since: 2009 },
  ange1: { since: 2005 },
  apex: { since: 2009 },
  azr: { since: 2013 },
  boltz: { since: 2014 },
  bondik: { since: 2009 },

  byali: { since: 2013 },
  cajunb: { since: 2010 },
  calyx: { since: 2014 },
  chopper: { since: 2013 },
  chrisj: { since: 2011 },
  coldzera: { since: 2012 },
  daps: { since: 2012 },
  dennis: { since: 2008 },
  device: { since: 2009, note: '丹麦狙击手，2009 年就在丹麦 CS 赛场出道' },
  dexter: { since: 2015 },
  dosia: { since: 2007 },
  dupreeh: { since: 2012 },
  edward: { since: 2001 },
  electronic: { since: 2015 },
  elige: { since: 2014 },
  emi: { since: 2008 },
  es3tag: { since: 2014 },
  ex6tenz: { since: 2005 },
  f0rest: { since: 2003 },
  fallen: { since: 2003 },
  fer: { since: 2011 },
  flamie: { since: 2012 },
  flusha: { since: 2009 },
  fnx: { since: 2004 },
  freeman: { since: 2015 },
  friberg: { since: 2007 },
  frozen: { since: 2015 },
  getright: { since: 2003 },
  gla1ve: { since: 2010 },
  gobb: { since: 2003 },
  golden: { since: 2015 },
  guardian: { since: 2006 },
  happy: { since: 2007 },
  hazed: { since: 2007 },
  hen1: { since: 2010 },
  hobbit: { since: 2014 },
  hooch: { since: 2002 },
  hunter: { since: 2015 },
  hutji: { since: 2015 },
  jkaem: { since: 2013 },
  jks: { since: 2010 },
  jw: { since: 2009 },
  k0nfig: { since: 2015 },

  karrigan: { since: 2006 },
  kennys: { since: 2011 },
  keshandr: { since: 2013 },
  kjaerbye: { since: 2014 },
  krimz: { since: 2012 },
  kscerato: { since: 2013 },
  lekr0: { since: 2014 },
  legija: { since: 2012 },
  magisk: { since: 2015 },
  maikelele: { since: 2008 },
  maj3r: { since: 2006 },
  maniac: { since: 2006 },
  markeloff: { since: 2004 },
  mertz: { since: 2015 },
  msl: { since: 2011 },
  nbk: { since: 2009 },
  neo: { since: 2000, note: '波兰 CS 1.6 时代的活化石' },
  nex: { since: 2012 },
  nexa: { since: 2013 },
  niko: { since: 2009, note: '波黑枪王 2009 年就在巴尔干 CS 1.6 赛场出道' },
  nitr0: { since: 2013 },
  olofmeister: { since: 2010 },
  pashabiceps: { since: 2004 },
  pronax: { since: 2007 },
  ptr: { since: 2011 },
  pyth: { since: 2010 },
  qikert: { since: 2015 },

  rpk: { since: 2006 },
  s1mple: { since: 2013 },
  scream: { since: 2010 },

  seized: { since: 2009 },
  smithzz: { since: 2005 },

  snappi: { since: 2008 },
  snax: { since: 2010 },
  somebody: { since: 2013 },

  summer: { since: 2012 },
  sunny: { since: 2012 },
  syrson: { since: 2012 },
  tabsen: { since: 2012 },
  taco: { since: 2011 },
  tarik: { since: 2014 },
  taz: { since: 2001 },
  twist: { since: 2012 },
  twistzz: { since: 2015 },
  worldedit: { since: 2010 },
  xantares: { since: 2013 },
  xccurate: { since: 2015 },
  xizt: { since: 2008 },
  xyp9x: { since: 2011 },

  zeus: { since: 2002 },
  znajder: { since: 2009 },

};

/** 昵称 / playerId / templateId 都能解析到卡池里的 playerId。 */
const ALIASES = new Map<string, string>();
PLAYERS.forEach((p) => {
  ALIASES.set(p.id.toLowerCase(), p.id);
  ALIASES.set(p.nickname.toLowerCase(), p.id);
});

export function resolvePlayerId(templateIdOrNickname: string): string | undefined {
  const raw = (templateIdOrNickname ?? '').trim();
  if (!raw) return undefined;
  const template = TEMPLATE_MAP[raw];
  if (template) return template.playerId;
  const direct = ALIASES.get(raw.toLowerCase());
  if (direct) return direct;
  const bare = raw.startsWith('tpl-') ? raw.slice(4).replace(/-\d{4}$/, '') : raw;
  return ALIASES.get(bare.toLowerCase());
}

/** 规则本身：出道年份不晚于截止年即为传奇。 */
export function isLegendSince(since: number): boolean {
  return Number.isFinite(since) && since <= LEGEND_DEBUT_CUTOFF;
}

/** 传奇信息（未收录或未达截止年返回 undefined）。 */
export function legendInfo(templateIdOrNickname: string): LegendEntry | undefined {
  const id = resolvePlayerId(templateIdOrNickname);
  if (!id) return undefined;
  const entry = LEGEND_PLAYERS[id];
  return entry && isLegendSince(entry.since) ? entry : undefined;
}

export function isLegend(templateIdOrNickname: string): boolean {
  return legendInfo(templateIdOrNickname) !== undefined;
}
