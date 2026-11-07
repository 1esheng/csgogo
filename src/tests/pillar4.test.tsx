// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '@/pages/SettingsPage';
import { TEMPLATE_MAP } from '@/data/cards';
import { RARITY_TABLE } from '@/data/config';
import type { Rarity } from '@/types';
import {
  SFX_MAX_SPAN, SFX_VOICES, getSfxPrefs, getSoundVolume, isSoundEnabled, playSfx,
  seedSoundPreference, setSoundEnabled, setSoundVolume, subscribeSfx, type SfxName,
} from '@/audio/sfx';
import {
  SEASON_THEME_STORAGE_KEY, seasonTexture, seasonTheme, seasonThemeStyle,
  isSeasonThemeEnabled, setSeasonThemeEnabled, subscribeSeasonTheme,
} from '@/theme/seasonTheme';
import { COACH_STYLE_KINDS, CoachStyleIcon, coachStyleKind } from '@/components/CoachStyleIcon';
import { PlayerCard, type PlayerCardView } from '@/components/PlayerCard';

/* ───────────────────────── Web Audio 假实现 ───────────────────────── */

interface Voice { freq: number; start: number; stop: number }

interface GainRef { value: number }

interface AudioSpy {
  contexts: number;
  voices: Voice[];
  gains: GainRef[];
}

function installFakeAudio(): AudioSpy {
  const spy: AudioSpy = { contexts: 0, voices: [], gains: [] };
  class FakeAudioContext {
    currentTime = 0;
    state: AudioContextState = 'running';
    destination = {} as AudioDestinationNode;
    constructor() { spy.contexts += 1; }
    resume(): Promise<void> { return Promise.resolve(); }
    createGain(): GainNode {
      const gain: GainRef = { value: 0 };
      spy.gains.push(gain);
      return {
        gain: {
          get value() { return gain.value; },
          set value(next: number) { gain.value = next; },
          setValueAtTime: (v: number) => { gain.value = v; },
          exponentialRampToValueAtTime: (v: number) => { gain.value = v; },
          linearRampToValueAtTime: (v: number) => { gain.value = v; },
        },
        connect: () => undefined,
        disconnect: () => undefined,
      } as unknown as GainNode;
    }
    createOscillator(): OscillatorNode {
      const rec: Voice = { freq: 0, start: 0, stop: 0 };
      const osc = {
        type: 'sine',
        frequency: { setValueAtTime: (v: number) => { rec.freq = v; } },
        connect: () => undefined,
        disconnect: () => undefined,
        start: (t: number) => { rec.start = t; spy.voices.push(rec); },
        stop: (t: number) => { rec.stop = t; },
      };
      return osc as unknown as OscillatorNode;
    }
  }
  (window as unknown as { AudioContext?: unknown }).AudioContext = FakeAudioContext;
  return spy;
}

function dropAudio(): void {
  const w = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown };
  delete w.AudioContext;
  delete w.webkitAudioContext;
}

beforeEach(() => {
  localStorage.clear();
  setSoundEnabled(false);
  setSoundVolume(0.35);
});

afterEach(() => {
  cleanup();
  dropAudio();
  vi.restoreAllMocks();
});

/* ───────────────────────── 音效层 ───────────────────────── */

describe('sfx · 五个合成音', () => {
  it('每个音效都 <= 120ms，且每个音只调度一次振荡器', () => {
    const names: SfxName[] = ['click', 'levelup', 'rare', 'win', 'lose'];
    expect(Object.keys(SFX_VOICES).sort()).toEqual([...names].sort());
    for (const name of names) {
      const voices = SFX_VOICES[name];
      expect(voices.length).toBeGreaterThan(0);
      for (const voice of voices) {
        expect(voice.at + voice.dur).toBeLessThanOrEqual(SFX_MAX_SPAN + 1e-6);
        expect(voice.gain).toBeGreaterThan(0);
        expect(voice.gain).toBeLessThan(0.2);
      }
    }
    expect(SFX_MAX_SPAN).toBe(0.12);
  });

  it('关闭时不创建 AudioContext', () => {
    const spy = installFakeAudio();
    playSfx('click');
    expect(spy.contexts).toBe(0);
    expect(spy.voices).toHaveLength(0);
  });

  it('没有 AudioContext 的环境静默降级', () => {
    dropAudio();
    setSoundEnabled(true);
    expect(() => playSfx('rare')).not.toThrow();
    expect(isSoundEnabled()).toBe(true);
    setSoundEnabled(false);
  });

  it('打开后复用一个 AudioContext，每个音都在 120ms 内收声', () => {
    const spy = installFakeAudio();
    setSoundEnabled(true);
    for (const name of ['click', 'levelup', 'rare', 'win', 'lose'] as SfxName[]) playSfx(name);
    expect(spy.contexts).toBe(1);
    const expected = (['click', 'levelup', 'rare', 'win', 'lose'] as SfxName[])
      .reduce((sum, name) => sum + SFX_VOICES[name].length, 0);
    expect(spy.voices).toHaveLength(expected);
    for (const voice of spy.voices) {
      expect(voice.stop - voice.start).toBeLessThanOrEqual(SFX_MAX_SPAN + 0.01);
      expect(voice.freq).toBeGreaterThan(200);
    }
    // 音量只由 master gain 控制：第一个 gain 是总线，值等于当前音量。
    expect(spy.gains[0].value).toBeCloseTo(0.35, 2);
  });

  it('音量夹在 0-1 并写进 localStorage', () => {
    setSoundVolume(2);
    expect(getSoundVolume()).toBe(1);
    setSoundVolume(-1);
    expect(getSoundVolume()).toBe(0);
    setSoundVolume(0.42);
    expect(getSoundVolume()).toBe(0.42);
    setSoundEnabled(true);
    const raw = JSON.parse(localStorage.getItem('cs2dx.sfx.v1') ?? '{}') as { enabled?: boolean; volume?: number };
    expect(raw.enabled).toBe(true);
    expect(raw.volume).toBe(0.42);
    expect(isSoundEnabled()).toBe(true);
  });

  it('订阅者在开关变化时收到通知，取消订阅后不再收到', () => {
    const seen: boolean[] = [];
    const off = subscribeSfx((p) => seen.push(p.enabled));
    setSoundEnabled(true);
    setSoundEnabled(false);
    off();
    setSoundEnabled(true);
    expect(seen).toEqual([true, false]);
  });

  it('本地已有偏好时 seed 不覆盖', () => {
    setSoundEnabled(true);
    seedSoundPreference(false);
    expect(getSfxPrefs().enabled).toBe(true);
    localStorage.clear();
    seedSoundPreference(true);
    expect(getSfxPrefs().enabled).toBe(true);
  });
});

/* ───────────────────────── 赛季主题 ───────────────────────── */

describe('seasonTheme · 只有一种琥珀色', () => {
  it('级别越高色相单向偏移，且始终落在琥珀区间', () => {
    const hues = Array.from({ length: 10 }, (_, i) => seasonTheme(i).hue);
    expect(hues[0]).toBeCloseTo(37.4, 1);
    for (let i = 1; i < hues.length; i += 1) expect(hues[i]).toBeGreaterThan(hues[i - 1]);
    for (const hue of hues) {
      expect(hue).toBeGreaterThan(30);
      expect(hue).toBeLessThan(45);
    }
  });

  it('强调色是合法十六进制，且永远不会变成第二种彩色', () => {
    for (let tier = 0; tier <= 9; tier += 1) {
      const theme = seasonTheme(tier);
      expect(theme.accent).toMatch(/^#[0-9a-f]{6}$/);
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(theme.accent.slice(i, i + 2), 16));
      // 琥珀：红 > 绿 > 蓝，红蓝差距大，绿位于中间。
      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(b);
      expect(r - b).toBeGreaterThan(150);
      expect(theme.hairline).toMatch(/^rgba\(\d+, \d+, \d+, 0\.3\)$/);
    }
  });

  it('背景颗粒从 0 起随级别极缓慢增长', () => {
    expect(seasonTheme(0).textureOpacity).toBe(0);
    const mid = seasonTheme(5).textureOpacity;
    const top = seasonTheme(9).textureOpacity;
    expect(mid).toBeGreaterThan(0);
    expect(top).toBeGreaterThan(mid);
    expect(top).toBeLessThanOrEqual(0.02);
    expect(seasonTexture(0)).toBe('none');
    expect(seasonTexture(top)).toContain('feTurbulence');
    expect(seasonTexture(top)).toContain(top.toFixed(3));
  });

  it('根节点样式只发出三个 CSS 变量与背景', () => {
    const style = seasonThemeStyle(seasonTheme(4));
    expect(Object.keys(style).sort()).toEqual(
      ['--season-accent', '--season-hairline', '--season-texture-opacity', 'backgroundImage'].sort(),
    );
    expect(style['--season-accent']).toBe(seasonTheme(4).accent);
    expect(style.backgroundImage).toContain('data:image/svg+xml');
  });

  it('开关落盘并通知订阅者', () => {
    expect(isSeasonThemeEnabled()).toBe(true);
    const seen: boolean[] = [];
    const off = subscribeSeasonTheme((on) => seen.push(on));
    setSeasonThemeEnabled(false);
    expect(localStorage.getItem(SEASON_THEME_STORAGE_KEY)).toBe('0');
    off();
    setSeasonThemeEnabled(true);
    expect(seen).toEqual([false]);
    expect(localStorage.getItem(SEASON_THEME_STORAGE_KEY)).toBe('1');
  });

  it('级别越界会夹到 0-9', () => {
    expect(seasonTheme(-3).tier).toBe(0);
    expect(seasonTheme(99).tier).toBe(9);
    expect(seasonTheme(Number.NaN).tier).toBe(0);
  });
});

/* ───────────────────────── 教练风格图标 ───────────────────────── */

describe('CoachStyleIcon · 内联 SVG', () => {
  it('四种风格都能画出来，线宽统一 1.5，颜色取 currentColor', () => {
    expect(COACH_STYLE_KINDS).toHaveLength(4);
    for (const kind of COACH_STYLE_KINDS) {
      const { container, unmount } = render(<CoachStyleIcon kind={kind} size={16} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('width')).toBe('16');
      expect(svg?.getAttribute('height')).toBe('16');
      expect(svg?.getAttribute('stroke')).toBe('currentColor');
      expect(svg?.getAttribute('stroke-width')).toBe('1.5');
      expect(svg?.getAttribute('fill')).toBe('none');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      const shapes = svg?.querySelectorAll('path, polygon, rect, circle') ?? [];
      expect(shapes.length).toBeGreaterThan(1);
      expect(svg?.querySelectorAll('[stroke-width]:not([stroke-width="1.5"])').length).toBe(0);
      unmount();
    }
  });

  it('提供 16 / 20 两档尺寸', () => {
    const { container, unmount } = render(<CoachStyleIcon kind='economy' size={20} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('20');
    expect(svg?.getAttribute('height')).toBe('20');
    unmount();
  });

  it('四种图形各不相同（不是同一张贴图换色）', () => {
    const drawn = COACH_STYLE_KINDS.map((kind) => {
      const { container, unmount } = render(<CoachStyleIcon kind={kind} />);
      const markup = container.querySelector('svg')?.innerHTML ?? '';
      unmount();
      return markup;
    });
    expect(new Set(drawn).size).toBe(4);
  });

  it('给了 title 才暴露给读屏', () => {
    const { container, unmount } = render(<CoachStyleIcon kind='training' title='训练' />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('训练');
    expect(container.querySelector('title')?.textContent).toBe('训练');
    unmount();
  });

  it('教练数据里的中文风格映射到正确的收益维度', () => {
    expect(coachStyleKind('培养')).toBe('training');
    expect(coachStyleKind('执教纪律')).toBe('economy');
    expect(coachStyleKind('战术')).toBe('debuff');
    expect(coachStyleKind('临场')).toBe('debuff');
    expect(coachStyleKind('未知风格')).toBe('attribute');
  });
});

/* ───────────────────────── 设置页开关 ───────────────────────── */

describe('设置页 · 两个本机偏好开关', () => {
  it('音效开关写 localStorage 而不是存档', () => {
    localStorage.clear();
    setSoundEnabled(false);
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const soundSwitch = screen.getByRole('switch', { name: '音效' });
    expect(soundSwitch.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(soundSwitch);
    expect(isSoundEnabled()).toBe(true);
    const raw = JSON.parse(localStorage.getItem('cs2dx.sfx.v1') ?? '{}') as { enabled?: boolean };
    expect(raw.enabled).toBe(true);
  });

  it('赛季主题开关默认打开，点一下关闭并落盘', () => {
    localStorage.clear();
    setSeasonThemeEnabled(true);
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const seasonSwitch = screen.getByRole('switch', { name: '赛季主题' });
    expect(seasonSwitch.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(seasonSwitch);
    expect(isSeasonThemeEnabled()).toBe(false);
    expect(localStorage.getItem(SEASON_THEME_STORAGE_KEY)).toBe('0');
  });
});

/* ───────────────────────── 卡面打磨 ───────────────────────── */

function view(overrides: Partial<PlayerCardView> = {}): PlayerCardView {
  const template = Object.values(TEMPLATE_MAP)[0];
  return { template, nickname: 's1mple', countryCode: 'UA', ovr: 96, level: 12, stars: 3, ...overrides };
}

describe('PlayerCard · 细节', () => {
  it('稀有度顶线在选中时加高并有过渡', () => {
    const { container, unmount } = render(<PlayerCard card={view()} selected />);
    const line = container.querySelector('span[aria-hidden="true"]');
    expect(line?.className).toContain('transition-[height,opacity]');
    expect(line?.className).toContain('h-[3px]');
    expect(line?.className).toContain('opacity-100');
    unmount();
    const plain = render(<PlayerCard card={view()} />);
    const rest = plain.container.querySelector('span[aria-hidden="true"]');
    expect(rest?.className).toContain('h-0.5');
    expect(rest?.className).toContain('opacity-80');
    plain.unmount();
  });

  it('OVR 用等宽数字并微调字距', () => {
    const template = Object.values(TEMPLATE_MAP)[0];
    const { container, unmount } = render(
      <PlayerCard card={{ template, nickname: 'device', countryCode: 'DK', ovr: 91, level: 4 }} />,
    );
    const ovr = Array.from(container.querySelectorAll('div')).find((el) => el.textContent === '91');
    expect(ovr?.className).toContain('tabular-nums');
    expect(ovr?.className).toContain('tracking-[-0.01em]');
    unmount();
  });

  it('发丝边 hover 提亮跟随赛季主题变量，卡片位移仍是 2px', () => {
    const template = Object.values(TEMPLATE_MAP)[0];
    const { container, unmount } = render(<PlayerCard card={{ template, nickname: 'NiKo', countryCode: 'BA', ovr: 90, level: 3 }} />);
    const card = container.querySelector('button');
    expect(card?.className).toContain('hover:border-[color:var(--season-hairline,rgba(255,255,255,0.25))]');
    expect(card?.className).toContain('card-face');
    // 稀有度顶线仍然用稀有度本色，没有被赛季主题污染。
    const rarityColor = RARITY_TABLE[template.rarity as Rarity].color.replace('#', '');
    const expectedRgb = [0, 2, 4].map((i) => parseInt(rarityColor.slice(i, i + 2), 16)).join(', ');
    const line = card?.querySelector('span[aria-hidden="true"]');
    expect(line?.getAttribute('style')).toContain('rgb(' + expectedRgb);
    // 等级星的颜色走赛季强调色变量，变量缺席时回落到品牌琥珀。
    const star = Array.from(card?.querySelectorAll('svg') ?? [])
      .find((svg) => (svg.getAttribute('style') ?? '').includes('--season-accent'));
    expect(star).toBeTruthy();
    expect(star?.getAttribute('style')).toContain('#F5A623');
    unmount();
  });
});
