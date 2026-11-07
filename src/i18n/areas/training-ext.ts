/**
 * 训练页「一键升满」与成就页「一键领取全部」的英文词条。
 * 结构与 areas/pillar3.ts 一致：命中本区词条就用英文，其余交给全局 tr() 回退。
 */
import { getLang, tr } from '@/i18n';

export const PHRASES: { zh: string; en: string }[] = [
  // —— 训练页：一键升满 ——
  { zh: '一键升满当前选手', en: 'Max out current player' },
  { zh: '一键升满全队', en: 'Max out the squad' },
  { zh: '（已满级）', en: ' (maxed)' },
  { zh: '（预算不足）', en: ' (budget short)' },
  { zh: '（', en: ' (' },
  { zh: ' 金币）', en: ' coins)' },
  { zh: ' 金币', en: ' coins' },
  { zh: '。', en: '.' },
  { zh: '该选手已满级，不需要再升级。', en: 'This player is already maxed — nothing left to upgrade.' },
  { zh: '预算不足：升级单价 ', en: 'Budget short: each level costs ' },
  { zh: ' 金币，当前金币 ', en: ' coins and you hold ' },
  { zh: '升满到 ', en: 'Max out to level ' },
  { zh: ' 级，共 ', en: ', ' },
  { zh: ' 金币。', en: ' coins in total.' },
  { zh: '金币不足，本次能升到 ', en: 'Not enough coins: this click reaches level ' },
  { zh: ' 级，花费 ', en: ', costs ' },
  { zh: ' 金币（还差 ', en: ' coins (short ' },
  { zh: ' 金币可满级）。', en: ' coins of a full max-out).' },
  { zh: '首发的选手都已满级，不需要再升级。', en: 'Every starter is already maxed — nothing left to upgrade.' },
  { zh: '预算不足：', en: 'Budget short: ' },
  { zh: ' 人分 ', en: ' starters split ' },
  { zh: ' 金币，每人 ', en: ' coins, ' },
  { zh: ' 金币，低于升级单价 ', en: ' coins each, below the ' },
  { zh: ' 金币/级。', en: ' coins a level.' },
  { zh: '每人预算 ', en: 'Budget per starter: ' },
  { zh: ' 金币：预计 ', en: ' coins — about ' },
  { zh: ' 人升级，共 ', en: ' starters level up for ' },
  { zh: '升到 ', en: 'Reached level ' },
  { zh: ' 级，花费 ', en: ', spent ' },
  { zh: ' 金币，还差 ', en: ' coins, short ' },
  { zh: ' 金币可满级', en: ' coins of a full max-out' },
  { zh: '已升到 ', en: 'Reached level ' },
  { zh: ' 级（满级），花费 ', en: ' (maxed), spent ' },
  { zh: ' 人升级，最高 ', en: ' starters levelled up, top level ' },
  { zh: ' 级，实付 ', en: ', paid ' },
  { zh: '上次一键升满：', en: 'Last single max-out: ' },
  { zh: '上次整队升满：', en: 'Last squad max-out: ' },
  { zh: '一键升满全队：', en: 'Squad max-out: ' },

  // —— 成就页：一键领取全部 ——
  { zh: '一键领取全部', en: 'Claim all' },
  { zh: '没有可领取项', en: 'Nothing to claim' },
  { zh: '领取 ', en: 'Claimed ' },
  { zh: ' 项，共 ', en: ' rewards for ' },
];

const MAP = new Map(PHRASES.map((p) => [p.zh, p.en]));

/** 训练 / 成就扩展区取词：命中本区词条就用英文，其余交给全局 tr()。 */
export function trTrainingExt(zh: string): string {
  const en = MAP.get(zh);
  if (en === undefined) return tr(zh);
  if (getLang() !== 'en') return zh;
  return en.replace(/（/g, ' (').replace(/）/g, ')').replace(/。/g, '.');
}
