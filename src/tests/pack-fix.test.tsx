// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useGameStore } from '@/stores/gameStore';
import { makeCard } from '@/game/starter';
import { CARD_TEMPLATES } from '@/data/cards';
import { PACK_CONFIG, RARITY_TABLE } from '@/data/config';
import { COACH_PACK } from '@/data/coaches';
import { PackReveal } from '@/features/packs/PackReveal';
import { CoachReveal } from '@/features/packs/CoachReveal';
import type { PlayerIdentity, Rarity } from '@/types';

const RANK: Record<Rarity, number> = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };

async function seed(coins: number) {
  await useGameStore.getState().newGame('UI 开包');
  useGameStore.setState({ club: { ...useGameStore.getState().club, coins } });
}

function playersNow(): Record<string, PlayerIdentity> {
  return useGameStore.getState().players();
}

function renderPack() {
  const results = useGameStore.getState().lastPackResults ?? [];
  const { container } = render(
    <PackReveal results={results} players={playersNow()} skipAnimation onClose={() => {}} />,
  );
  return container;
}

function statValue(container: HTMLElement, label: string): string {
  const dts = [...container.querySelectorAll('dt')];
  const dt = dts.find((node) => (node.textContent ?? '').trim() === label);
  expect(dt, 'missing stat tile: ' + label).toBeTruthy();
  const dd = dt!.parentElement!.querySelector('dd');
  return (dd?.textContent ?? '').trim();
}

function gridTiles(container: HTMLElement): Element[] {
  return [...container.querySelectorAll('ul[aria-label="抽到的卡牌"] > li')];
}

function textOf(container: HTMLElement): string {
  return container.textContent ?? '';
}

/** 三条共同的红线：不显示未到账的金币/精通/碎片，也不再有「五星封顶」的旧说明。 */
function expectNoPhantomRewards(container: HTMLElement) {
  const text = textOf(container);
  expect(text).not.toContain('碎片');
  expect(text).not.toContain('精通 +');
  expect(text).not.toContain('兑换 +');
  expect(text).not.toMatch(/五星|满 5 星|封顶/);
  expect(text).toContain('卡牌合成');
  expect(container.innerHTML).not.toContain('linear-gradient');
  expect(container.innerHTML).not.toContain('box-shadow');
}

afterEach(() => {
  cleanup();
  useGameStore.getState().clearPackResults();
  useGameStore.getState().clearCoachResults();
});

describe('开包结果 UI 与实际发放一致', () => {
  it('单抽：一张卡、入库文案与返回数据一致，且不显示任何未到账奖励', async () => {
    await seed(20000);
    const before = useGameStore.getState().club.coins;
    const beforeCards = useGameStore.getState().cards.length;
    const results = useGameStore.getState().openPack(1)!;
    expect(results.length).toBe(1);

    // 真实结算：每张结果都生成一张卡；金币只扣不返。
    expect(useGameStore.getState().cards.length).toBe(beforeCards + 1);
    expect(useGameStore.getState().club.coins).toBe(before - PACK_CONFIG.singlePrice);

    const container = renderPack();
    expect(statValue(container, '总抽取')).toBe('1');
    expect(statValue(container, '新卡')).toBe(results.filter((r) => r.isNew).length.toString());
    expect(statValue(container, '重复')).toBe(results.filter((r) => !r.isNew).length.toString());
    expect(gridTiles(container).length).toBe(1);
    const expectLabel = results[0].isNew ? '新卡 · 已入卡册' : '重复 · 已入库';
    expect(textOf(container)).toContain(expectLabel);
    expect(textOf(container)).toContain('没有返还金币');
    expectNoPhantomRewards(container);
  });

  it('十连：摘要数字、逐张文案与十张真实入库的卡一致', async () => {
    await seed(20000);
    const before = useGameStore.getState().club.coins;
    const beforeCards = useGameStore.getState().cards.length;
    const results = useGameStore.getState().openPack(10)!;
    expect(results.length).toBe(10);
    expect(useGameStore.getState().cards.length).toBe(beforeCards + 10);
    expect(useGameStore.getState().club.coins).toBe(before - PACK_CONFIG.tenPrice);

    const newCount = results.filter((r) => r.isNew).length;
    const container = renderPack();
    expect(statValue(container, '总抽取')).toBe('10');
    expect(statValue(container, '新卡')).toBe(String(newCount));
    expect(statValue(container, '重复')).toBe(String(10 - newCount));

    const tiles = gridTiles(container);
    expect(tiles.length).toBe(10);
    expect(tiles.filter((t) => (t.textContent ?? '').includes('新卡 · 已入卡册')).length).toBe(newCount);
    expect(tiles.filter((t) => (t.textContent ?? '').includes('重复 · 已入库')).length).toBe(10 - newCount);
    expectNoPhantomRewards(container);
  });

  it('百连：先给摘要（总抽取/新卡/重复/最高稀有度/稀有清单），点开才渲染长网格', async () => {
    await seed(200000);
    const before = useGameStore.getState().club.coins;
    const beforeCards = useGameStore.getState().cards.length;
    const results = useGameStore.getState().openPack(100)!;
    expect(results.length).toBe(100);
    expect(useGameStore.getState().cards.length).toBe(beforeCards + 100);
    expect(useGameStore.getState().club.coins).toBe(before - PACK_CONFIG.hundredPrice);

    const newCount = results.filter((r) => r.isNew).length;
    const best = results.reduce<Rarity>((top, r) => (RANK[r.rarity] > RANK[top] ? r.rarity : top), 'N');
    const rares = results.filter((r) => RANK[r.rarity] >= 2).length;

    const container = renderPack();
    expect(statValue(container, '总抽取')).toBe('100');
    expect(statValue(container, '新卡')).toBe(String(newCount));
    expect(statValue(container, '重复')).toBe(String(100 - newCount));
    expect(statValue(container, '最高稀有度').startsWith(best)).toBe(true);
    expect(textOf(container)).toContain(RARITY_TABLE[best].label);
    // 稀有卡清单：史诗及以上逐张列出（可能为 0，此时给一句说明）
    if (rares > 0) {
      expect(container.querySelectorAll('ul[aria-label="稀有卡"] > li').length).toBe(rares);
      expect(container.querySelectorAll('ul[aria-label="稀有卡"] > li').length).toBeGreaterThan(0);
    } else {
      expect(textOf(container)).toContain('本次没有抽到史诗及以上的卡牌');
    }
    // 折叠态：长网格不渲染，只有摘要 + 入口
    expect(gridTiles(container).length).toBe(0);
    const expand = [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes('查看全部卡牌')) as HTMLButtonElement;
    expect(expand, 'missing 查看全部卡牌 entry').toBeTruthy();
    expect(textOf(container)).toContain('查看全部卡牌');
    expectNoPhantomRewards(container);

    // 展开后 100 张逐张可见，且能收起
    fireEvent.click(expand);
    expect(gridTiles(container).length).toBe(100);
    const collapse = [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes('收起卡牌')) as HTMLButtonElement;
    expect(collapse).toBeTruthy();
    fireEvent.click(collapse);
    expect(gridTiles(container).length).toBe(0);
  });

  it('重复卡结算：全部重复时依然是「入库作为升星材料」，金币只扣不返、账本无返还条目', async () => {
    await seed(20000);
    // 把全部模板都放进收藏 -> 每一抽都是重复卡
    useGameStore.setState({ cards: CARD_TEMPLATES.map((tpl, i) => makeCard(tpl.id, 1 + (i % 3))) });
    const before = useGameStore.getState().club.coins;
    const beforeCards = useGameStore.getState().cards.length;
    const beforeIds = new Set(useGameStore.getState().coinsLedger.map((e) => e.id));
    const results = useGameStore.getState().openPack(10)!;

    expect(results.every((r) => !r.isNew)).toBe(true);
    // 重复卡照样入库（升星材料），一张都不折算成金币
    expect(useGameStore.getState().cards.length).toBe(beforeCards + 10);
    expect(useGameStore.getState().club.coins).toBe(before - PACK_CONFIG.tenPrice);
    const ledger = useGameStore.getState().coinsLedger;
    const newEntries = ledger.filter((e) => !beforeIds.has(e.id));
    expect(newEntries.length).toBe(1);
    expect(newEntries[0].delta).toBe(-PACK_CONFIG.tenPrice);
    expect(newEntries.every((e) => e.delta <= 0)).toBe(true);
    expect(ledger.filter((e) => e.reason.includes('重复')).length).toBe(0);

    const container = renderPack();
    expect(statValue(container, '新卡')).toBe('0');
    expect(statValue(container, '重复')).toBe('10');
    expect(textOf(container)).toContain('其中重复卡');
    expect(textOf(container)).toContain('张已入库，可用于「图鉴 → 卡牌合成」升星。');
    expect(gridTiles(container).filter((t) => (t.textContent ?? '').includes('重复 · 已入库')).length).toBe(10);
    expectNoPhantomRewards(container);
  });

  it('教练包：重复教练的 25 点执教经验确实到账，UI 不再显示任何金币返还', async () => {
    await seed(200000);
    const before = useGameStore.getState().club.coins;
    const signed = useGameStore.getState().openCoachPack(10)!;
    expect(signed.length).toBe(10);
    expect(useGameStore.getState().club.coins).toBe(before - COACH_PACK.ten);
    // 真实规则：重复教练给自己 +25 执教经验
    const coachResults = useGameStore.getState().lastCoachResults!;
    expect(coachResults.length).toBe(10);
    expect(coachResults.filter((r) => !r.isNew).every((r) => r.xpGained === 25)).toBe(true);
    expect(coachResults.filter((r) => r.isNew).every((r) => r.xpGained === 0)).toBe(true);

    const { container } = render(<CoachReveal results={coachResults} skipAnimation onClose={() => {}} />);
    const dupCount = coachResults.filter((r) => !r.isNew).length;
    const tiles = [...container.querySelectorAll('ul[aria-label="签下的教练"] > li')];
    expect(tiles.length).toBe(10);
    expect(tiles.filter((t) => (t.textContent ?? '').includes('重复 · 执教经验 +25')).length).toBe(dupCount);
    expect(tiles.filter((t) => (t.textContent ?? '').includes('新教练 · 已进入教练组')).length).toBe(10 - dupCount);
    expect(textOf(container)).not.toContain('金币 +');
    expect(textOf(container)).not.toMatch(/\+\d+ 金币/);
    expect(textOf(container)).not.toContain('碎片');
    expect(container.innerHTML).not.toContain('linear-gradient');
    expect(container.innerHTML).not.toContain('box-shadow');
  });
});
