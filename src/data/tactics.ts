import type { Side, TacticSpec } from '@/types';

export interface Tactic extends TacticSpec {
  /** Extra strength for CT post-plant retakes. */
  retakeBonus: number;
  /** 0-1: how exposed the tactic is to a fast counter-push. */
  aggressionRisk: number;
  /** How many players commit to the primary site (1 = all five). */
  commit: number;
}

export const T_TACTICS: Tactic[] = [
  {
    id: 'fast_rush', name: '快速 Rush', side: 'T',
    blurb: '五人抢在 CT 布置好之前冲点。波动极大，专治慢热防守。',
    contactAt: 20, attackPower: 1.14, defensePower: 1, siteBias: { A: 0.5, B: 0.5 }, split: 0,
    utility: 0.28, info: 0.18, trade: 0.52, plantSpeed: 0.92, vsSpread: 0.13, vsStack: -0.11,
    retakeBonus: 0, aggressionRisk: 0.34, commit: 1,
  },
  {
    id: 'default', name: '默认执行', side: 'T',
    blurb: '均衡控图，先靠对枪和中路信息再决定方向。',
    contactAt: 52, attackPower: 1.03, defensePower: 1, siteBias: { A: 0.5, B: 0.5 }, split: 0.12,
    utility: 0.5, info: 0.62, trade: 0.72, plantSpeed: 0.5, vsSpread: 0.03, vsStack: 0.02,
    retakeBonus: 0, aggressionRisk: 0.08, commit: 0.8,
  },
  {
    id: 'slow_execute', name: '慢打执行', side: 'T',
    blurb: '耗光时间、逼掉 CT 道具，最后一波满道具执行。',
    contactAt: 82, attackPower: 1.16, defensePower: 1, siteBias: { A: 0.5, B: 0.5 }, split: 0.08,
    utility: 0.9, info: 0.55, trade: 0.66, plantSpeed: 0.34, vsSpread: 0.08, vsStack: 0.15,
    retakeBonus: 0, aggressionRisk: 0.05, commit: 0.9,
  },
  {
    id: 'mid_control', name: '中路控制', side: 'T',
    blurb: '先抢中路，逼出轮转，再打人手不足的那一侧。',
    contactAt: 44, attackPower: 1.09, defensePower: 1, siteBias: { A: 0.5, B: 0.5 }, split: 0.2,
    utility: 0.62, info: 0.86, trade: 0.6, plantSpeed: 0.46, vsSpread: 0.07, vsStack: 0.11,
    retakeBonus: 0, aggressionRisk: 0.12, commit: 0.75,
  },
  {
    id: 'fake_execute', name: '假打转点', side: 'T',
    blurb: '一边铺满道具造势，全队再转另一侧。专克重守轮转。',
    contactAt: 64, attackPower: 1.11, defensePower: 1, siteBias: { A: 0.5, B: 0.5 }, split: 0.55,
    utility: 0.76, info: 0.5, trade: 0.62, plantSpeed: 0.56, vsSpread: 0.17, vsStack: -0.07,
    retakeBonus: 0, aggressionRisk: 0.16, commit: 0.7,
  },
  {
    id: 'split_attack', name: '双侧夹击', side: 'T',
    blurb: '两个方向同时压一个点，补枪几乎自动成立。',
    contactAt: 58, attackPower: 1.13, defensePower: 1, siteBias: { A: 0.5, B: 0.5 }, split: 0.45,
    utility: 0.7, info: 0.52, trade: 0.8, plantSpeed: 0.62, vsSpread: 0.19, vsStack: -0.09,
    retakeBonus: 0, aggressionRisk: 0.18, commit: 0.85,
  },
];

export const CT_TACTICS: Tactic[] = [
  {
    id: 'standard_defense', name: '标准防守', side: 'CT',
    blurb: '两点各两人、一人轮转。覆盖均衡，道具使用克制。',
    contactAt: 48, attackPower: 1, defensePower: 1.03, siteBias: { A: 0.5, B: 0.5 }, split: 0,
    utility: 0.5, info: 0.55, trade: 0.68, plantSpeed: 0, vsSpread: 0.04, vsStack: 0.02,
    retakeBonus: 0.03, aggressionRisk: 0.06, commit: 0.6,
  },
  {
    id: 'aggressive_push', name: '主动前压', side: 'CT',
    blurb: '开开局先抢一个人头拿主动权。赢了很爽，输了很空。',
    contactAt: 24, attackPower: 1, defensePower: 1.13, siteBias: { A: 0.5, B: 0.5 }, split: 0,
    utility: 0.4, info: 0.7, trade: 0.55, plantSpeed: 0, vsSpread: 0.08, vsStack: -0.06,
    retakeBonus: -0.05, aggressionRisk: 0.32, commit: 0.55,
  },
  {
    id: 'passive_hold', name: '被动架点', side: 'CT',
    blurb: '让出空间，卡死狭窄角度，把时间当队友。',
    contactAt: 76, attackPower: 1, defensePower: 1.15, siteBias: { A: 0.5, B: 0.5 }, split: 0,
    utility: 0.36, info: 0.32, trade: 0.72, plantSpeed: 0, vsSpread: -0.04, vsStack: 0.1,
    retakeBonus: -0.08, aggressionRisk: 0.03, commit: 0.5,
  },
  {
    id: 'stack_site', name: '重守一点', side: 'CT',
    blurb: '三到四个人堆在一个点。碾碎进攻，但另一侧完全裸奔。',
    contactAt: 42, attackPower: 1, defensePower: 1.24, siteBias: { A: 0.5, B: 0.5 }, split: 0,
    utility: 0.44, info: 0.4, trade: 0.8, plantSpeed: 0, vsSpread: -0.12, vsStack: 0.14,
    retakeBonus: 0.02, aggressionRisk: 0.14, commit: 0.75,
  },
  {
    id: 'retake_setup', name: '回防布置', side: 'CT',
    blurb: '先放点、保人，用道具赢 5v5 的回防。',
    contactAt: 62, attackPower: 1, defensePower: 0.94, siteBias: { A: 0.5, B: 0.5 }, split: 0,
    utility: 0.7, info: 0.5, trade: 0.74, plantSpeed: 0, vsSpread: 0.06, vsStack: -0.05,
    retakeBonus: 0.16, aggressionRisk: 0.08, commit: 0.45,
  },
];

export const ALL_TACTICS: Tactic[] = [...T_TACTICS, ...CT_TACTICS];

export const TACTIC_MAP: Record<string, Tactic> = Object.fromEntries(ALL_TACTICS.map((t) => [t.id, t]));

export function tacticsForSide(side: Side): Tactic[] {
  return side === 'T' ? T_TACTICS : CT_TACTICS;
}

export function tacticById(id: string): Tactic {
  return TACTIC_MAP[id] ?? (TACTIC_MAP.default as Tactic);
}