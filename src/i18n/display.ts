/**
 * 展示层文案映射：回合原因、回合编号与胜负文案。
 * 中文一律走 tr()（英文由 phrases 的 en 分支提供）；旧存档里的英文回合串在渲染期解析，
 * 因此赛后结算屏、战绩详情弹窗与逐回合回放共用同一份映射。
 */
import { pick } from '@/i18n';
import { REASON_LABEL } from '@/data/config';

type Tr = (zh: string) => string;

/** 旧存档里的英文回合原因 → 引擎 reason code（RoundRecord.reason）。 */
const LEGACY_REASON: Record<string, string> = {
  'bomb detonation': 'bomb',
  'clutch defuse': 'defuse',
  'time expired': 'time',
  elimination: 'elimination',
  clutch: 'clutch',
  ace: 'ace',
};

/** 回合原因的单一映射：引擎 reason code 或旧存档英文串 → 当前语言文案。 */
export function roundReasonText(reason: string, tr: Tr): string {
  const code = LEGACY_REASON[reason] ?? reason;
  return tr(REASON_LABEL[code] ?? code);
}

/** 回合编号：中文「第 19 回合」，英文「Round 19」。 */
export function roundLabel(roundNumber: number): string {
  return pick('第 ' + roundNumber + ' 回合', 'Round ' + roundNumber);
}

/** 旧存档预生成的英文关键回合文案（Round 19: bomb detonation (9:10)）→ 第 19 回合 · 炸弹爆炸（9:10）。 */
export function localizeRoundText(text: string, tr: Tr): string {
  const m = /^Round (\d+): (.+?) \((\d+):(\d+)\)$/.exec(text);
  if (!m) return text;
  const code = LEGACY_REASON[m[2]] ?? m[2];
  if (!(code in REASON_LABEL)) return text;
  return roundLabel(Number(m[1])) + ' · ' + roundReasonText(m[2], tr) + '（' + m[3] + ':' + m[4] + '）';
}

/** 胜负战绩：中文「2胜0负」，英文「2W0L」。 */
export function winLossText(wins: number, losses: number, tr: Tr): string {
  return wins + tr('胜') + losses + tr('负');
}
