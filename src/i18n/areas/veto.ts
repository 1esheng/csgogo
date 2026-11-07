/**
 * 地图 BP（veto）面板的英文词条。
 * 结构与 areas/ui-match.ts 一致：命中本区词条就用英文，其余交给全局 tr() 回退。
 */
import { getLang, tr } from '@/i18n';

export const PHRASES: { zh: string; en: string }[] = [
  // —— 选图方式 ——
  { zh: '快速选图', en: 'Quick pick' },
  { zh: '沿用原来的直接选图。', en: 'The original one-click map pick.' },
  { zh: 'Veto 演练', en: 'Veto drill' },
  { zh: '按 BO1 / BO3 顺序推演 ban / pick，结束后自动回填选图。', en: 'Walk a BO1 / BO3 ban-pick order; the decider fills in your map.' },

  // —— 赛制与先手 ——
  { zh: '赛制', en: 'Format' },
  { zh: 'BO1：六次 BAN 留一张决胜图。', en: 'BO1: six bans leave one decider.' },
  { zh: 'BO3：两 BAN、两 PICK、两 BAN，留一张决胜图。', en: 'BO3: two bans, two picks, two bans — one map left.' },
  { zh: '先手', en: 'First' },
  { zh: '我方先手', en: 'We start' },
  { zh: '对手先手', en: 'They start' },

  // —— 步骤条 ——
  { zh: '步骤', en: 'Step' },
  { zh: 'BAN', en: 'BAN' },
  { zh: 'PICK', en: 'PICK' },
  { zh: 'BP 结束 · 决胜图 ', en: 'Veto done · decider ' },
  { zh: '撤销', en: 'Undo' },
  { zh: '重新开始', en: 'Restart' },
  { zh: '决胜图', en: 'Decider' },
  { zh: '已 BAN', en: 'Banned' },
  { zh: '已 PICK', en: 'Picked' },
  { zh: '点选地图推进一步。', en: 'Tap a map to advance the veto.' },
  { zh: 'BP 已完成，选图已回填。', en: 'Veto complete — your map is set.' },
];

const MAP = new Map(PHRASES.map((p) => [p.zh, p.en]));

/** BP 面板取词：命中本区词条就用英文，其余交给全局 tr()。 */
export function trVeto(zh: string): string {
  const en = MAP.get(zh);
  if (en === undefined) return tr(zh);
  if (getLang() !== 'en') return zh;
  return en.replace(/（/g, ' (').replace(/）/g, ')').replace(/。/g, '.');
}
