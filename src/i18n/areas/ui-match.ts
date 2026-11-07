/**
 * 比赛准备 / 实时界面的英文词条（由界面精修子智能体维护，勿与其它分区混写）。
 * 结构与 areas/gameplay.ts 一致：命中本区词条就用英文，其余交给全局 tr() 回退。
 */
import { getLang, tr } from '@/i18n';

export const PHRASES: { zh: string; en: string }[] = [
  // —— 准备页：对抗摘要 ——
  { zh: '对抗摘要', en: 'Matchup' },
  { zh: '去补齐阵容', en: 'Fix lineup' },
  { zh: '还差 ', en: 'Need ' },
  { zh: ' 人开赛', en: ' more to play' },
  { zh: '已选', en: 'Selected' },

  // —— 准备页：分区标题 ——
  { zh: '阵容自检', en: 'Lineup check' },
  { zh: '侦查详情', en: 'Scouting report' },
  { zh: '收起详情', en: 'Hide details' },

  // —— 准备页：地图战术示意 ——
  { zh: '战术要点', en: 'Tactical read' },
  { zh: '中路权重', en: 'Mid control' },
  { zh: 'T 加成', en: 'T bonus' },
  { zh: 'CT 加成', en: 'CT bonus' },
  { zh: '狙击倍率', en: 'AWP factor' },
  { zh: '熟练度', en: 'Comfort' },

  // —— 准备页：战术预设 ——
  { zh: '当前：', en: 'Current: ' },
  { zh: '对手与地图已锁定，随时可以开打。', en: 'Opponent and map are locked — ready when you are.' },

  // —— 实时界面 ——
  { zh: '上半场', en: 'First half' },
  { zh: '下半场', en: 'Second half' },
  { zh: '回合结果', en: 'Round result' },
  { zh: '资金', en: 'Bank' },
  { zh: '数据', en: 'Stats' },
];

const MAP = new Map(PHRASES.map((p) => [p.zh, p.en]));

/** 比赛准备 / 实时界面的文案取词：命中本区词条就用英文，其余交给全局 tr()。 */
export function trUiMatch(zh: string): string {
  const en = MAP.get(zh);
  if (en === undefined) return tr(zh);
  if (getLang() !== 'en') return zh;
  return en.replace(/（/g, ' (').replace(/）/g, ')').replace(/。/g, '.');
}
