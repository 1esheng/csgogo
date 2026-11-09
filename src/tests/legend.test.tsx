// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGameStore, type GameStore } from '@/stores/gameStore';
import { createNewGame } from '@/game/starter';
import { RARITY_TABLE } from '@/data/config';
import { PLAYER_MAP, getTemplate } from '@/data/cards';
import {
  LEGEND_DEBUT_CUTOFF, LEGEND_PLAYERS, isLegend, isLegendSince, legendInfo, resolvePlayerId,
} from '@/data/legends';
import { PlayerCard } from '@/components/PlayerCard';
import { CardDetailBody } from '@/components/CardDetail';
import { GalleryPage } from '@/pages/GalleryPage';

afterEach(() => cleanup());

function seedStore(overrides: Partial<GameStore> = {}) {
  const snap = createNewGame('Legend Test Club');
  useGameStore.setState({
    ready: true,
    hasGame: true,
    club: snap.club,
    cards: snap.cards,
    squad: snap.squad,
    pack: snap.pack,
    training: [],
    matches: [],
    prospects: [],
    leaders: snap.leaders,
    career: snap.career,
    tournaments: [],
    settings: snap.settings,
    tasks: snap.tasks,
    coinsLedger: snap.coinsLedger,
    customTemplates: [],
    customPlayers: [],
    activeMatch: null,
    activeMatchInfo: null,
    playerOrders: null,
    lastSummary: null,
    lastPackResults: null,
    ...overrides,
  });
}

function cardView(templateId: string) {
  const template = getTemplate(templateId);
  if (!template) throw new Error('missing template ' + templateId);
  return { template, nickname: template.playerId, countryCode: 'SE', ovr: 90, level: 1 };
}

describe('传奇判定规则', () => {
  it('截止年是固定常量 2015，不随当前年份漂移', () => {
    expect(LEGEND_DEBUT_CUTOFF).toBe(2015);
  });

  it('2015 年及以前出道为传奇，2016 年起不算', () => {
    expect(isLegendSince(2015)).toBe(true);
    expect(isLegendSince(2016)).toBe(false);
    expect(isLegendSince(1988)).toBe(true);
    expect(isLegendSince(Number.NaN)).toBe(false);
  });

  it('templateId / playerId / 昵称 都能解析', () => {
    expect(isLegend('tpl-f0rest-2023')).toBe(true);
    expect(isLegend('f0rest')).toBe(true);
    expect(isLegend('GeT_RiGhT')).toBe(true);
    expect(legendInfo('tpl-f0rest-2023')?.since).toBe(LEGEND_PLAYERS.f0rest.since);
    expect(legendInfo('donk')).toBeUndefined();
    expect(isLegend('不存在的昵称')).toBe(false);
  });
});

describe('传奇名录数据完整性', () => {
  it('每个 key 都是 cards.ts 里真实存在的选手', () => {
    const keys = Object.keys(LEGEND_PLAYERS);
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach((key) => expect(PLAYER_MAP[key], key).toBeTruthy());
  });

  it('没有超过截止年的误收', () => {
    Object.entries(LEGEND_PLAYERS).forEach(([key, entry]) => {
      expect(entry.since, key).toBeLessThanOrEqual(LEGEND_DEBUT_CUTOFF);
      expect(Number.isInteger(entry.since), key).toBe(true);
      expect(entry.since, key).toBeGreaterThanOrEqual(1990);
    });
  });

  it('2017 年后出道的卡池选手不会被误标为传奇', () => {
    ['donk', 'm0nesy', 'b1t', 'w0nderful', 'ultimate', 'arrozdoce', 'story', 'jame', 'spinx', 'ax1le']
      .forEach((id) => expect(isLegend(id), id).toBe(false));
  });

  it('传奇标签不改变稀有度：5 档稀有度与概率表原样', () => {
    expect(Object.keys(RARITY_TABLE)).toEqual(['N', 'R', 'SR', 'SSR', 'UR']);
    expect(RARITY_TABLE.N.rate).toBe(0.58);
    expect(RARITY_TABLE.R.rate).toBe(0.25);
    expect(RARITY_TABLE.SR.rate).toBe(0.12);
    expect(RARITY_TABLE.SSR.rate).toBe(0.04);
    expect(RARITY_TABLE.UR.rate).toBe(0.01);
    // 同一位传奇卡也可以是任意稀有度：标签与稀有度互不影响
    expect(getTemplate('tpl-f0rest-2023')?.rarity).toBeTruthy();
    expect(getTemplate('tpl-zywoo-2026')?.rarity).toBe('UR');
    expect(isLegend('zywoo')).toBe(false); // 2016 出道，已在新截止年之外
  });
});

describe('卡面传奇标识', () => {
  it('传奇卡渲染 LEGEND 标记，顶线加宽成发丝金线', () => {
    const { container } = render(<PlayerCard card={cardView('tpl-f0rest-2023')} />);
    const mark = container.querySelector('[data-legend]');
    expect(mark).not.toBeNull();
    expect(mark!.textContent).toContain('传奇');
    const line = container.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(line.className).toContain('h-[3px]');
    expect((line.getAttribute('style') ?? '').toLowerCase()).toMatch(/#d8b26a|216, 178, 106/);
    // 稀有度顶线仍然在，但传奇线用暖金覆盖
    expect(container.textContent).toContain('综合');
  });

  it('非传奇卡不渲染标记，顶线仍是原来的 hairline', () => {
    const { container } = render(<PlayerCard card={cardView('tpl-donk-2026')} />);
    expect(container.querySelector('[data-legend]')).toBeNull();
    expect(container.textContent).not.toContain('传奇');
    const line = container.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(line.className).toContain('h-0.5');
  });

  it('卡牌详情在标题下显示「传奇 · 自 YYYY 年征战」', () => {
    const template = getTemplate('tpl-f0rest-2023')!;
    const { container } = render(
      <CardDetailBody
        template={template}
        nickname='f0rest'
        countryCode='SE'
        ovr={92}
        level={3}
        xpPct={0.4}
        xpLabel='100 XP'
      />,
    );
    const line = container.querySelector('[data-legend]');
    expect(line).not.toBeNull();
    expect(line!.textContent).toContain('传奇');
    expect(line!.textContent).toContain(String(LEGEND_PLAYERS.f0rest.since));
    expect(line!.textContent).toContain('年征战');
  });
});

describe('图鉴传奇筛选', () => {
  it('选中「传奇」chip 后列表只剩传奇选手，且可与稀有度筛选叠加', () => {
    seedStore();
    const { container } = render(<MemoryRouter><GalleryPage /></MemoryRouter>);
    fireEvent.click(screen.getByText('全部图鉴'));

    const chip = container.querySelector('[data-legend-filter]') as HTMLButtonElement;
    expect(chip).not.toBeNull();
    expect(chip.getAttribute('aria-pressed')).toBe('false');

    const names = () => Array.from(container.querySelectorAll('.card-face')).map((n) => n.getAttribute('title') ?? '');
    const before = names();
    const expectedLegends = Object.values(useGameStore.getState().templates())
      .filter((t) => isLegend(t.playerId))
      .map((t) => t.playerId);
    expect(before.length).toBeGreaterThan(expectedLegends.length);
    expect(expectedLegends.length).toBeGreaterThan(10);

    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    const legendOnlyNames = names();
    expect(legendOnlyNames.length).toBe(expectedLegends.length);
    expect(legendOnlyNames.every((name) => isLegend(name))).toBe(true);
    expect(legendOnlyNames).not.toContain('donk');

    // 叠加稀有度：传奇 + N 档 → 只保留既是传奇又是 N 的卡
    const raritySelect = container.querySelectorAll('select')[0] as HTMLSelectElement;
    fireEvent.change(raritySelect, { target: { value: 'N' } });
    const stacked = names();
    expect(stacked.length).toBeGreaterThan(0);
    expect(stacked.length).toBeLessThanOrEqual(legendOnlyNames.length);
    stacked.forEach((name) => {
      expect(isLegend(name)).toBe(true);
      const playerId = resolvePlayerId(name);
      const template = Object.values(useGameStore.getState().templates()).find((t) => t.playerId === playerId)!;
      expect(template.rarity).toBe('N');
    });
  });
});
