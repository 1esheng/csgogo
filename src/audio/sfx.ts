/**
 * 合成音效层：五个短音全部由 Web Audio 现场合成——仓库里没有任何音频文件。
 *
 * 三条约定：
 * 1. AudioContext 懒创建：只有用户打开「音效」后真的触发一次声音时才 new（浏览器要求在用户手势之后）。
 * 2. 偏好（开关 / 音量）存 localStorage，不进存档。
 * 3. 没有 window 或 AudioContext（SSR、测试环境、老浏览器）时静默降级，绝不抛错打断界面。
 */
import { useEffect, useState } from 'react';

export type SfxName = 'click' | 'levelup' | 'rare' | 'win' | 'lose';

export interface SfxVoice {
  /** 基频（Hz）。 */
  freq: number;
  /** 相对音效起点的延迟（秒）。 */
  at: number;
  /** 时长（秒）。 */
  dur: number;
  /** 峰值增益；最终还会乘上用户音量。 */
  gain: number;
  type: OscillatorType;
}

export interface SfxPrefs {
  enabled: boolean;
  volume: number;
}

/**
 * 每个音效总时长 <= 120ms：click 26ms、levelup 110ms、rare 120ms、win 120ms、lose 120ms。
 * 只有正弦/三角波加一条指数衰减包络——没有混响、没有循环、没有采样。
 */
export const SFX_VOICES: Record<SfxName, readonly SfxVoice[]> = {
  click: [
    { freq: 1480, at: 0, dur: 0.026, gain: 0.16, type: 'sine' },
    { freq: 2120, at: 0, dur: 0.016, gain: 0.05, type: 'triangle' },
  ],
  levelup: [
    { freq: 659.25, at: 0, dur: 0.05, gain: 0.16, type: 'triangle' },
    { freq: 987.77, at: 0.048, dur: 0.062, gain: 0.15, type: 'triangle' },
  ],
  rare: [
    { freq: 880, at: 0, dur: 0.04, gain: 0.13, type: 'sine' },
    { freq: 1174.66, at: 0.03, dur: 0.045, gain: 0.12, type: 'sine' },
    { freq: 1567.98, at: 0.065, dur: 0.055, gain: 0.11, type: 'sine' },
  ],
  win: [
    { freq: 523.25, at: 0, dur: 0.06, gain: 0.12, type: 'triangle' },
    { freq: 659.25, at: 0.035, dur: 0.06, gain: 0.11, type: 'triangle' },
    { freq: 783.99, at: 0.07, dur: 0.05, gain: 0.1, type: 'triangle' },
  ],
  lose: [
    { freq: 392, at: 0, dur: 0.055, gain: 0.14, type: 'sine' },
    { freq: 293.66, at: 0.05, dur: 0.07, gain: 0.13, type: 'sine' },
  ],
};

/** 单个音效允许的最长跨度（秒）——回归测试按它守住预算。 */
export const SFX_MAX_SPAN = 0.12;

const STORAGE_KEY = 'cs2dx.sfx.v1';
const DEFAULT_VOLUME = 0.35;
const ATTACK = 0.006;
const FLOOR = 0.0001;

type Listener = (prefs: SfxPrefs) => void;

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readPrefs(): SfxPrefs {
  const fallback: SfxPrefs = { enabled: false, volume: DEFAULT_VOLUME };
  const box = store();
  if (!box) return fallback;
  try {
    const raw = box.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    const rec = parsed as Record<string, unknown>;
    return {
      enabled: typeof rec.enabled === 'boolean' ? rec.enabled : fallback.enabled,
      volume: typeof rec.volume === 'number' ? clampVolume(rec.volume) : fallback.volume,
    };
  } catch {
    return fallback;
  }
}

let prefs: SfxPrefs = readPrefs();
const listeners = new Set<Listener>();

function commit(next: SfxPrefs): void {
  prefs = next;
  const box = store();
  if (box) {
    try {
      box.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* 隐私模式下 localStorage 会抛错——偏好退化成内存态，界面照常工作。 */
    }
  }
  listeners.forEach((fn) => fn(prefs));
}

/** 对象引用只在真正变更时替换，订阅方可以安全地做 === 比较。 */
export function getSfxPrefs(): SfxPrefs {
  return prefs;
}

export function isSoundEnabled(): boolean {
  return prefs.enabled;
}

export function getSoundVolume(): number {
  return prefs.volume;
}

export function subscribeSfx(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setSoundEnabled(enabled: boolean): void {
  if (prefs.enabled === enabled) return;
  commit({ ...prefs, enabled });
  if (master) master.gain.value = prefs.volume;
}

export function setSoundVolume(volume: number): void {
  const next = clampVolume(volume);
  if (master) master.gain.value = next;
  if (prefs.volume === next) return;
  commit({ ...prefs, volume: next });
}

/** 老存档里的 settings.soundEnabled 只作为「没有任何本地偏好」时的初始值，从不回写存档。 */
export function seedSoundPreference(enabled: boolean): void {
  const box = store();
  if (!box) return;
  try {
    if (box.getItem(STORAGE_KEY) !== null) return;
  } catch {
    return;
  }
  commit({ ...prefs, enabled });
}

type AudioCtor = new () => AudioContext;

function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** 懒初始化；任何失败都只是让音效静音，不影响调用方。 */
function ensureContext(): AudioContext | null {
  if (ctx && master) return ctx;
  const Ctor = audioCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = prefs.volume;
    master.connect(ctx.destination);
    return ctx;
  } catch {
    ctx = null;
    master = null;
    return null;
  }
}

function schedule(ac: AudioContext, out: GainNode, voice: SfxVoice, origin: number): void {
  const start = origin + voice.at;
  const end = start + voice.dur;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = voice.type;
  osc.frequency.setValueAtTime(voice.freq, start);
  env.gain.setValueAtTime(FLOOR, start);
  env.gain.exponentialRampToValueAtTime(voice.gain, Math.min(start + ATTACK, end));
  env.gain.exponentialRampToValueAtTime(FLOOR, end);
  osc.connect(env);
  env.connect(out);
  osc.start(start);
  osc.stop(end + 0.005);
}

/** 组件内订阅开关与音量；state 引用只在真正变更时替换。 */
export function useSfxPrefs(): SfxPrefs {
  const [state, setState] = useState<SfxPrefs>(getSfxPrefs);
  useEffect(() => subscribeSfx(setState), []);
  return state;
}

/** 唯一的播放入口：没开开关就什么都不做（也就不会创建 AudioContext）。 */
export function playSfx(name: SfxName): void {
  if (!prefs.enabled) return;
  const ac = ensureContext();
  if (!ac || !master) return;
  if (ac.state === 'suspended') {
    try {
      void ac.resume();
    } catch {
      /* resume 在无用户手势时会被拒绝——下一次点击会再试。 */
    }
  }
  const origin = ac.currentTime + 0.001;
  for (const voice of SFX_VOICES[name]) {
    try {
      schedule(ac, master, voice, origin);
    } catch {
      /* 单个泛音调度失败不能影响界面。 */
    }
  }
}
