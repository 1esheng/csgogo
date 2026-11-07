/**
 * 地图 BP（veto）流程层：只生成可逐步推进的 ban/pick 序列，不参与任何比赛数值计算。
 * 地图池由调用方从 data 传入（现有 7 张），赛制只有 BO1 / BO3。
 */
import type { MapId } from '@/types';

export type VetoFormat = 'BO1' | 'BO3';
/** us = 我方，them = 对手。 */
export type VetoSide = 'us' | 'them';
export type VetoAction = 'ban' | 'pick';

export interface VetoStep {
  action: VetoAction;
  side: VetoSide;
}

export interface VetoEntry {
  step: VetoStep;
  mapId: MapId;
}

export interface VetoState {
  format: VetoFormat;
  firstSide: VetoSide;
  pool: MapId[];
  steps: VetoStep[];
  entries: VetoEntry[];
  remaining: MapId[];
}

export type VetoApplyResult =
  | { ok: true; state: VetoState }
  | { ok: false; error: string };

/**
 * 动作序列：7 张池子里 BO1 六 ban 留一张决胜图；
 * BO3 两 ban、两 pick、两 ban，同样留一张决胜图。
 */
const SEQUENCE: Record<VetoFormat, VetoAction[]> = {
  BO1: ['ban', 'ban', 'ban', 'ban', 'ban', 'ban'],
  BO3: ['ban', 'ban', 'pick', 'pick', 'ban', 'ban'],
};

export const VETO_FORMATS: VetoFormat[] = ['BO1', 'BO3'];

export function otherSide(side: VetoSide): VetoSide {
  return side === 'us' ? 'them' : 'us';
}

/** 动作序列决定 ban / pick，步数决定轮到谁：双方严格交替出手。 */
export function vetoSteps(format: VetoFormat, firstSide: VetoSide): VetoStep[] {
  return SEQUENCE[format].map((action, index) => ({
    action,
    side: index % 2 === 0 ? firstSide : otherSide(firstSide),
  }));
}

export function createVeto(pool: MapId[], format: VetoFormat, firstSide: VetoSide): VetoState {
  return {
    format,
    firstSide,
    pool: [...pool],
    steps: vetoSteps(format, firstSide),
    entries: [],
    remaining: [...pool],
  };
}

export function isVetoComplete(state: VetoState): boolean {
  return state.entries.length >= state.steps.length;
}

/** 当前该谁操作（动作 + 出手方）；BP 结束后为 null。 */
export function currentVetoStep(state: VetoState): VetoStep | null {
  return state.steps[state.entries.length] ?? null;
}

/** 唯一剩余的那张图；BP 未结束时为 null。 */
export function vetoResultMap(state: VetoState): MapId | null {
  if (!isVetoComplete(state)) return null;
  return state.remaining[0] ?? null;
}

export function vetoBanned(state: VetoState): MapId[] {
  return state.entries.filter((e) => e.step.action === 'ban').map((e) => e.mapId);
}

export function vetoPicked(state: VetoState): MapId[] {
  return state.entries.filter((e) => e.step.action === 'pick').map((e) => e.mapId);
}

/** 推进一步：只接受当前地图池里还在的地图，其余一律拒绝并返回原因。 */
export function applyVetoChoice(state: VetoState, mapId: MapId): VetoApplyResult {
  const step = currentVetoStep(state);
  if (!step) return { ok: false, error: 'BP 已经结束了。' };
  if (!state.pool.includes(mapId)) return { ok: false, error: '这张地图不在本局地图池里。' };
  if (!state.remaining.includes(mapId)) return { ok: false, error: '这张地图已经被 BAN 或 PICK 了。' };
  return {
    ok: true,
    state: {
      ...state,
      entries: [...state.entries, { step, mapId }],
      remaining: state.remaining.filter((m) => m !== mapId),
    },
  };
}

/** 回退一步：把手上的那张图按原池顺序放回去。 */
export function undoVetoChoice(state: VetoState): VetoState {
  if (state.entries.length === 0) return state;
  const entries = state.entries.slice(0, -1);
  const taken = new Set(entries.map((e) => e.mapId));
  return { ...state, entries, remaining: state.pool.filter((m) => !taken.has(m)) };
}
