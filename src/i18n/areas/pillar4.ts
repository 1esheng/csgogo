/**
 * 支柱四（内容与表现）新增词条：音效、赛季主题、执教风格。
 * 结构与 areas/veto.ts 一致：命中本区词条就用英文，其余交给全局 tr() 回退。
 *
 * 注意：本任务不允许改 phrases.ts，所以全局表里还没有本区。
 * 协调方接入只需在 phrases.ts 里加两行（import + 展开），见交付报告。
 */
import { getLang, tr } from '@/i18n';

export const PHRASES: { zh: string; en: string }[] = [
  // —— 音效 ——
  { zh: '按键、升级、开包、比赛结算都会发出一声短促的合成音，默认关闭。', en: 'Clicks, level-ups, packs and results each get one short synthesized cue. Off by default.' },
  { zh: '音效全部由 Web Audio 现场合成，构建里不含任何音频文件。', en: 'Every cue is synthesized on the fly with Web Audio — the build ships no audio files.' },
  { zh: '打开音效', en: 'Sound on' },
  { zh: '关闭音效', en: 'Sound off' },
  { zh: '音量', en: 'Volume' },

  // —— 赛季主题 ——
  { zh: '赛季主题', en: 'Season theme' },
  { zh: '按生涯级别微调琥珀色的色相与背景颗粒，始终只有一种强调色。', en: 'Nudges the amber hue and a faint background grain with your career tier — one accent colour, always.' },
  { zh: '关闭赛季主题', en: 'Disable season theme' },
  { zh: '关闭后使用默认琥珀色，不再叠加背景颗粒。', en: 'Off falls back to the default amber with no background grain.' },

  // —— 执教风格图标 ——
  { zh: '属性', en: 'Attributes' },
  { zh: '训练', en: 'Training' },
  { zh: '经济', en: 'Economy' },
  { zh: '削弱对手', en: 'Opponent disruption' },
];

const MAP = new Map(PHRASES.map((p) => [p.zh, p.en]));

/** 本区取词：命中本区词条就用英文，其余交给全局 tr()。 */
export function trPillar4(zh: string): string {
  const en = MAP.get(zh);
  if (en === undefined) return tr(zh);
  if (getLang() !== 'en') return zh;
  return en.replace(/（/g, ' (').replace(/）/g, ')').replace(/。/g, '.');
}
