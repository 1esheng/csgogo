/**
 * 玩法 的英文词条（战术默认配置 / 教练成长）。
 * 由子智能体维护，勿与其它分区混写；新增文案写在这里，界面通过 trGameplay() 取。
 */
import { getLang, tr } from '@/i18n';

export const PHRASES: { zh: string; en: string }[] = [
  { zh: "进攻战术预设", en: "Attack tactic preset" },
  { zh: "换图时自动套用该图的默认战术；比赛里仍然可以随时改。", en: "Switching the map applies that map's default tactic; you can still change it mid-match." },
  { zh: "设为该图默认", en: "Set as map default" },
  { zh: "取消该图默认", en: "Clear map default" },
  { zh: "该图默认：", en: "Map default: " },
  { zh: "该图还没有默认战术", en: "No default tactic for this map" },
  { zh: "开赛时使用的执行方案。", en: "The execute you open the match with." },
  { zh: "执教能力", en: "Coaching ability" },
  { zh: "教练成长", en: "Coach growth" },
  { zh: "经验", en: "XP" },
  { zh: "每 100 经验升 1 级，每级执教能力 +1（上限 99）。", en: "+1 coaching ability per 100 XP of experience (cap 99)." },
  { zh: "成长 +", en: "Growth +" },
  { zh: "执教经验 ", en: "Coach XP " },
];

const MAP = new Map(PHRASES.map((p) => [p.zh, p.en]));

/** 玩法分区的文案取词：命中本区词条就用英文，其余交给全局 tr()。 */
export function trGameplay(zh: string): string {
  const en = MAP.get(zh);
  if (en === undefined) return tr(zh);
  if (getLang() !== 'en') return zh;
  return en.replace(/（/g, ' (').replace(/）/g, ')').replace(/。/g, '.');
}
