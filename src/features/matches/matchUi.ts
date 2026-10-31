import type { MatchEventKind, RoundRecord, Side } from '@/types';
import { REASON_LABEL } from '@/data/config';

export interface EventKindMeta {
  label: string;
  tone: string;
  dot: string;
}

/** Visual language for every MatchEventKind the engine can emit. */
export const EVENT_KIND_META: Record<MatchEventKind, EventKindMeta> = {
  'round-start': { label: '回合开始', tone: 'text-txt-muted', dot: 'bg-white/30' },
  buy: { label: '购买', tone: 'text-sky-300', dot: 'bg-sky-400' },
  utility: { label: '道具', tone: 'text-teal-300', dot: 'bg-teal-400' },
  info: { label: '信息', tone: 'text-indigo-300', dot: 'bg-indigo-400' },
  duel: { label: '交火', tone: 'text-txt', dot: 'bg-white/60' },
  opening: { label: '首杀', tone: 'text-accent', dot: 'bg-accent' },
  multi: { label: '多杀', tone: 'text-accent', dot: 'bg-accent' },
  plant: { label: '安包', tone: 'text-orange-300', dot: 'bg-orange-400' },
  defuse: { label: '拆包', tone: 'text-emerald-300', dot: 'bg-emerald-400' },
  explode: { label: '爆炸', tone: 'text-danger', dot: 'bg-danger' },
  timeout: { label: '超时', tone: 'text-txt-muted', dot: 'bg-white/30' },
  elimination: { label: '击杀', tone: 'text-danger', dot: 'bg-danger' },
  save: { label: '保枪', tone: 'text-txt-muted', dot: 'bg-white/30' },
  clutch: { label: '残局', tone: 'text-accent', dot: 'bg-accent' },
  'round-end': { label: '回合结束', tone: 'text-txt', dot: 'bg-white/80' },
  halftime: { label: '半场', tone: 'text-accent', dot: 'bg-accent' },
  'match-end': { label: '比赛结束', tone: 'text-accent', dot: 'bg-accent' },
  tactic: { label: '战术', tone: 'text-violet-300', dot: 'bg-violet-400' },
};

/** Economy style of an AI roster, as shown on its scouting card. */
export const ECON_STYLE_LABEL: Record<'conservative' | 'balanced' | 'aggressive', string> = {
  conservative: '保守',
  balanced: '均衡',
  aggressive: '激进',
};

/** Round end reasons come straight from the shared config label map. */
export const ROUND_REASON_LABEL: Record<RoundRecord['reason'], string> = REASON_LABEL;

/** Round clock is seconds remaining (115 -> 0); render it as m:ss. */
export function clockLabel(clock: number): string {
  const total = Math.max(0, Math.round(clock));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes + ':' + (seconds < 10 ? '0' + seconds : String(seconds));
}

export function moneyLabel(value: number): string {
  const cash = Math.round(value);
  if (Math.abs(cash) >= 1000) {
    const k = cash / 1000;
    return '$' + (Number.isInteger(k) ? String(k) : k.toFixed(1)) + 'k';
  }
  return '$' + cash;
}

export function sideTone(side: Side): 'accent' | 'neutral' {
  return side === 'T' ? 'accent' : 'neutral';
}

export function hpTone(hp: number): string {
  if (hp > 66) return 'bg-gradient-to-r from-emerald-600 to-emerald-400';
  if (hp > 33) return 'bg-gradient-to-r from-accent-dim to-accent';
  return 'bg-gradient-to-r from-danger/70 to-danger';
}

export function hpWidth(hp: number): string {
  return Math.max(0, Math.min(100, Math.round(hp))) + '%';
}
