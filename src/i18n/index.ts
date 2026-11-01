/**
 * 极简 i18n：中文为默认语言，英文覆盖「界面外壳 + 主要页面标题 + 关键按钮」。
 * 未翻译的深层文案（球员简介、赛事说明等）自动回退中文。
 */
import { trPhrase } from '@/i18n/phrases';

export type Lang = 'zh' | 'en';

type Entry = { zh: string; en: string };

export const DICT: Record<string, Entry> = {
  // ── 导航 ──
  'nav.dashboard': { zh: '俱乐部总览', en: 'Overview' },
  'nav.squad': { zh: '阵容', en: 'Lineup' },
  'nav.gallery': { zh: '选手图鉴', en: 'Collection' },
  'nav.packs': { zh: '卡包', en: 'Packs' },
  'nav.training': { zh: '训练', en: 'Training' },
  'nav.coaches': { zh: '教练组', en: 'Coaching' },
  'nav.match': { zh: '训练赛', en: 'Scrims' },
  'nav.career': { zh: '生涯', en: 'Career' },
  'nav.rankings': { zh: '排行榜', en: 'Rankings' },
  'nav.records': { zh: '战绩', en: 'Results' },
  'nav.achievements': { zh: '成就', en: 'Achievements' },
  'nav.settings': { zh: '设置', en: 'Settings' },
  'nav.group.club': { zh: '俱乐部', en: 'Club' },
  'nav.group.match': { zh: '比赛', en: 'Competition' },
  'nav.group.system': { zh: '系统', en: 'System' },

  // ── 通用 ──
  'common.coins': { zh: '金币', en: 'Coins' },
  'common.level': { zh: '级', en: 'Lv' },
  'common.stars': { zh: '星', en: 'star' },
  'common.ovr': { zh: '综合', en: 'OVR' },
  'common.enter': { zh: '进入', en: 'Enter' },
  'common.close': { zh: '关闭', en: 'Close' },
  'common.claim': { zh: '领取', en: 'Claim' },
  'common.claimed': { zh: '已领取', en: 'Claimed' },
  'common.locked': { zh: '未解锁', en: 'Locked' },
  'common.back': { zh: '返回', en: 'Back' },
  'common.continue': { zh: '继续', en: 'Continue' },
  'common.refresh': { zh: '刷新', en: 'Refresh' },
  'common.current': { zh: '当前', en: 'Current' },
  'common.completed': { zh: '已完成', en: 'Completed' },
  'common.search': { zh: '搜索', en: 'Search' },
  'common.lineupPower': { zh: '阵容战力', en: 'Team power' },
  'common.bench': { zh: '替补', en: 'Bench' },

  // ── 角色 / 稀有度 / 赛制 / 档位 ──
  'role.AWPer': { zh: '狙击手', en: 'AWPer' },
  'role.Entry': { zh: '突破手', en: 'Entry' },
  'role.Lurker': { zh: '自由人', en: 'Lurker' },
  'role.Support': { zh: '辅助', en: 'Support' },
  'role.Anchor': { zh: '主防', en: 'Anchor' },
  'role.IGL': { zh: '指挥', en: 'IGL' },
  'rarity.N': { zh: '普通', en: 'Common' },
  'rarity.R': { zh: '稀有', en: 'Rare' },
  'rarity.SR': { zh: '史诗', en: 'Epic' },
  'rarity.SSR': { zh: '传奇', en: 'Legendary' },
  'rarity.UR': { zh: '巅峰', en: 'Ultimate' },
  'format.single': { zh: '单败', en: 'Single elim' },
  'format.double': { zh: '双败', en: 'Double elim' },
  'format.swiss': { zh: '瑞士轮', en: 'Swiss' },
  'tier.0': { zh: '公开预选赛', en: 'Open Qualifier' },
  'tier.1': { zh: '城市联赛', en: 'City League' },
  'tier.2': { zh: '区域联赛', en: 'Regional League' },
  'tier.3': { zh: '国家杯', en: 'National Cup' },
  'tier.4': { zh: '挑战者联赛', en: 'Challenger League' },
  'tier.5': { zh: '精英联赛', en: 'Elite League' },
  'tier.6': { zh: '国际邀请赛', en: 'International Invitational' },
  'tier.7': { zh: '大师赛', en: 'Masters' },
  'tier.8': { zh: '全球总决赛', en: 'Global Finals' },
  'tier.9': { zh: 'MAJOR', en: 'MAJOR' },

  // ── 页面标题 ──
  'page.dashboard.title': { zh: '俱乐部总览', en: 'Club Overview' },
  'page.dashboard.starters': { zh: '首发五人', en: 'Starting five' },
  'page.dashboard.coach': { zh: '主教练', en: 'Head coach' },
  'page.dashboard.honors': { zh: '战队荣誉', en: 'Trophy cabinet' },
  'page.dashboard.preview': { zh: '选手收藏预览', en: 'Card preview' },
  'page.dashboard.matchCenter': { zh: '比赛中心', en: 'Match center' },
  'page.dashboard.recent': { zh: '最近战绩', en: 'Recent results' },
  'page.dashboard.form': { zh: '状态走势', en: 'Form' },
  'page.gallery.title': { zh: '选手图鉴', en: 'Player collection' },
  'page.gallery.owned': { zh: '我的卡牌', en: 'My cards' },
  'page.gallery.all': { zh: '全部图鉴', en: 'Full catalog' },
  'page.gallery.fuse': { zh: '卡牌合成', en: 'Star fusion' },
  'page.packs.title': { zh: '卡包中心', en: 'Pack store' },
  'page.training.title': { zh: '训练', en: 'Training' },
  'page.coaches.title': { zh: '教练组', en: 'Coaching staff' },
  'page.career.title': { zh: '生涯', en: 'Career' },
  'page.career.ladder': { zh: '联赛阶梯', en: 'Circuit ladder' },
  'page.career.records': { zh: '赛事记录', en: 'Event history' },
  'page.rankings.title': { zh: '排行榜', en: 'World rankings' },
  'page.records.title': { zh: '战绩', en: 'Match results' },
  'page.settings.title': { zh: '设置', en: 'Settings' },
  'page.squad.title': { zh: '阵容', en: 'Lineup' },
  'page.achievements.title': { zh: '成就', en: 'Achievements' },
  'page.match.title': { zh: '训练赛', en: 'Scrims' },
  'page.team.title': { zh: '战队详情', en: 'Team profile' },
  'page.settings.language': { zh: '界面语言', en: 'Language' },
  'page.settings.languageHint': { zh: '切换界面语言（深层文案暂保留中文）。', en: 'Switch UI language (long-form copy stays Chinese for now).' },
};

let current: Lang = 'zh';

export function setLang(lang: Lang) { current = lang; }
export function getLang(): Lang { return current; }

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let text = entry ? entry[lang] : key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => { text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v)); });
  }
  return text;
}

/** 中文文案直译：有英文词条就换成英文，否则原样返回。 */
export function tr(zh: string): string {
  const out = trPhrase(current, zh);
  if (current !== 'en') return out;
  // 英文下的标点收口：全角括号/句号换成半角，避免 Rename club（2000 Coins）这种混排
  return out.replace(/（/g, ' (').replace(/）/g, ')').replace(/。/g, '.');
}

/** 组件内使用：t('nav.dashboard') */
export function t(key: string, vars?: Record<string, string | number>): string {
  return translate(current, key, vars);
}

/** 语言无关的辅助：按当前语言取中文/英文字段 */
export function pick(zh: string, en: string): string {
  return current === 'en' ? en : zh;
}

/** engine/data 返回的中文模板句，按模式在渲染期英文化；zh 下原样返回。 */
const ROLE_EN: Record<string, string> = { 狙击手: 'AWPer', 突破手: 'Entry', 自由人: 'Lurker', 辅助: 'Support', 主防: 'Anchor', 指挥: 'IGL' };
function roleEn(zh: string): string { return ROLE_EN[zh] ?? zh; }

export function localizeDynamic(text: string): string {
  if (current !== 'en') return text;
  const rules: Array<[RegExp, string | ((...args: string[]) => string)]> = [
    [/^位置 (.+) 指向的卡牌已经不在收藏里了。$/, 'The card assigned to $1 is no longer in your collection.'],
    [/^(.+) 被重复上场——不允许。$/, '$1 is already on the field — duplicates are not allowed.'],
    [/^还差 (\d+) 人才能开赛$/, 'Need $1 more players to play'],
    [/^只填了 (\d+)\/(\d+) 个位置——阵容补齐前无法开赛。$/, 'Only $1/$2 slots filled — finish the lineup before playing.'],
    [/^(.+) 打 (.+) 明显不在位置上。$/, (m, p1, role) => p1 + ' on ' + roleEn(role) + ' is clearly out of position.'],
    [/^(.+) 被重复上场——不允许。$/, (m, p1) => p1 + ' is already on the field — duplicates are not allowed.'],
  ];
  for (const [re, out] of rules) {
    if (re.test(text)) return text.replace(re, out as unknown as string).replace(/（/g, ' (').replace(/）/g, ')').replace(/。/g, '.');

  }
  return tr(text);
}
