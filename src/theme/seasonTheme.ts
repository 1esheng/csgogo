/**
 * 赛季主题：按生涯级别给强调色做一点点色相偏移，并叠一层极淡的背景颗粒。
 *
 * 约束：始终是同一个琥珀色家族——只有 hue 在 37.4°-42.4° 之间移动，
 * 饱和度/亮度保持不变，所以不会出现第二种彩色。关闭开关后不设置任何变量，
 * 界面回落到品牌色 #F5A623。
 */
import { useEffect, useState } from 'react';

export interface SeasonTheme {
  /** 已经 clamp 到 0-9 的赛季级别。 */
  tier: number;
  /** 强调色色相（度）。 */
  hue: number;
  /** 强调色（十六进制）。 */
  accent: string;
  /** 发丝边用的半透明强调色。 */
  hairline: string;
  /** 背景颗粒不透明度，0 表示不绘制。 */
  textureOpacity: number;
}

export const SEASON_THEME_MAX_TIER = 9;
export const SEASON_THEME_STORAGE_KEY = 'cs2dx.seasonTheme.v1';

/** #F5A623 ≈ hsl(37.4 91.3% 54.9%)：品牌琥珀的起点。 */
const BASE_HUE = 37.4;
const HUE_STEP = 0.55;
const SATURATION = 0.913;
const LIGHTNESS = 0.549;
const MAX_TEXTURE = 0.02;

const listeners = new Set<(enabled: boolean) => void>();

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readEnabled(): boolean {
  const box = store();
  if (!box) return true;
  try {
    const raw = box.getItem(SEASON_THEME_STORAGE_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

let enabled = readEnabled();

export function clampTier(tier: number): number {
  if (!Number.isFinite(tier)) return 0;
  return Math.min(SEASON_THEME_MAX_TIER, Math.max(0, Math.round(tier)));
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = l - c / 2;
  const channel = (v: number): string => Math.round(Math.min(1, Math.max(0, v + m)) * 255).toString(16).padStart(2, '0');
  return '#' + channel(r) + channel(g) + channel(b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const body = hex.replace('#', '');
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
  };
}

export function seasonTheme(tier: number): SeasonTheme {
  const t = clampTier(tier);
  const hue = round(BASE_HUE + t * HUE_STEP, 1);
  const accent = hslToHex(hue, SATURATION, LIGHTNESS);
  const rgb = hexToRgb(accent);
  return {
    tier: t,
    hue,
    accent,
    hairline: 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.3)',
    textureOpacity: round((t / SEASON_THEME_MAX_TIER) * MAX_TEXTURE, 4),
  };
}

const textureCache = new Map<string, string>();

/** 背景颗粒用内联 SVG 的 feTurbulence 现场画，不引入任何图片文件。 */
export function seasonTexture(opacity: number): string {
  if (!(opacity > 0)) return 'none';
  const key = opacity.toFixed(3);
  const cached = textureCache.get(key);
  if (cached) return cached;
  const svg = "%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E"
    + "%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E"
    + "%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E"
    + "%3Crect width='96' height='96' filter='url(%23g)' opacity='" + key + "'/%3E%3C/svg%3E";
  const uri = 'url("data:image/svg+xml,' + svg + '")';
  textureCache.set(key, uri);
  return uri;
}

/** 根节点内联 style：三个 CSS 变量 + 颗粒背景。调用方再断言成 React.CSSProperties。 */
export function seasonThemeStyle(theme: SeasonTheme): Record<string, string> {
  return {
    '--season-accent': theme.accent,
    '--season-hairline': theme.hairline,
    '--season-texture-opacity': String(theme.textureOpacity),
    backgroundImage: seasonTexture(theme.textureOpacity),
  };
}

export function isSeasonThemeEnabled(): boolean {
  return enabled;
}

export function subscribeSeasonTheme(fn: (enabled: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 组件内订阅开关；App 与设置页共用同一个状态源。 */
export function useSeasonThemeEnabled(): boolean {
  const [on, setOn] = useState<boolean>(isSeasonThemeEnabled);
  useEffect(() => subscribeSeasonTheme(setOn), []);
  return on;
}

export function setSeasonThemeEnabled(next: boolean): void {
  if (enabled === next) return;
  enabled = next;
  const box = store();
  if (box) {
    try {
      box.setItem(SEASON_THEME_STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* 隐私模式下写不进去也没关系，本次会话内仍然生效。 */
    }
  }
  listeners.forEach((fn) => fn(enabled));
}
