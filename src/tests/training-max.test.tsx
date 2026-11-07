// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGameStore, type GameStore } from '@/stores/gameStore';
import { clearDatabase } from '@/db/db';
import { createNewGame } from '@/game/starter';
import { planLevelUp, planSquadLevelUp, RosterTraining } from '@/features/training/RosterTraining';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { ECONOMY, LEVEL_CONFIG } from '@/data/config';

const PRICE = ECONOMY.levelUpCoins;
const CAP = LEVEL_CONFIG.maxLevel;

function seed(overrides: Partial<GameStore> = {}) {
  const snap = createNewGame('Max Out Club');
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
    coaches: [],
    headCoachId: null,
    coachXp: {},
    tacticDefaults: {},
    claimedAchievements: [],
    coinsLedger: snap.coinsLedger,
    customTemplates: [],
    customPlayers: [],
    activeMatch: null,
    activeMatchInfo: null,
    playerOrders: null,
    lastSummary: null,
    lastPackResults: null,
    celebration: null,
    toasts: [],
    ...overrides,
  });
  return snap;
}

function renderTraining() {
  return render(
    <MemoryRouter>
      <RosterTraining />
    </MemoryRouter>,
  );
}

function renderAchievements() {
  return render(
    <MemoryRouter>
      <AchievementsPage />
    </MemoryRouter>,
  );
}

function levelOf(templateId: string): number {
  const card = useGameStore.getState().cards.find((c) => c.templateId === templateId);
  expect(card).toBeDefined();
  return card!.level;
}

beforeEach(async () => {
  await clearDatabase();
});

afterEach(() => cleanup());

describe('level-up price: one per-level price, summed step by step, no discount', () => {
  it('charges the sum of the per-level price up to the cap', () => {
    const plan = planLevelUp(1, 1_000_000);
    expect(plan.perLevel).toBe(PRICE);
    expect(plan.steps).toBe(CAP - 1);
    expect(plan.cost).toBe((CAP - 1) * PRICE);
    expect(plan.fullCost).toBe((CAP - 1) * PRICE);
    expect(plan.targetLevel).toBe(CAP);
  });

  it('stops at the highest level the budget covers', () => {
    const plan = planLevelUp(1, PRICE * 2 + 10);
    expect(plan.steps).toBe(2);
    expect(plan.cost).toBe(PRICE * 2);
    expect(plan.targetLevel).toBe(3);
    expect(plan.fullCost).toBe((CAP - 1) * PRICE);
  });

  it('gives every upgradable starter the same floor(coins / members) budget', () => {
    const snap = seed();
    const plan = planSquadLevelUp({ cards: useGameStore.getState().cards, slots: snap.squad.slots, coins: PRICE * 5 + 30 });
    expect(plan.members).toBe(5);
    expect(plan.budget).toBe(Math.floor((PRICE * 5 + 30) / 5));
    expect(plan.mode).toBe('ready');
    expect(plan.entries.length).toBe(5);
    expect(plan.cost).toBe(PRICE * 5);
  });
});

describe('max out one player: real charge, real level', () => {
  it('reaches the cap and charges exactly the per-level sum', () => {
    const snap = seed({ club: { ...createNewGame('Rich Club').club, coins: 20_000 } });
    const target = snap.cards[0];
    const coinsBefore = useGameStore.getState().club.coins;
    const result = useGameStore.getState().levelUpCards([{ templateId: target.templateId, budget: coinsBefore }]);
    expect(result.ok).toBe(true);
    expect(result.results![0].to).toBe(CAP);
    expect(result.spent).toBe((CAP - 1) * PRICE);
    const state = useGameStore.getState();
    expect(state.club.coins).toBe(coinsBefore - (CAP - 1) * PRICE);
    expect(levelOf(target.templateId)).toBe(CAP);
    const card = state.cards.find((c) => c.templateId === target.templateId)!;
    expect(card.xp).toBe(LEVEL_CONFIG.xpTable[CAP - 1]);
  });

  it('stops mid-way when coins run out and reports the shortfall', () => {
    seed({ club: { ...createNewGame('Broke Club').club, coins: 500 } });
    const { container } = renderTraining();
    const button = screen.getByRole('button', { name: /一键升满当前选手/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain(((CAP - 1) * PRICE).toLocaleString());

    fireEvent.click(button);

    const state = useGameStore.getState();
    const levelled = state.cards.filter((card) => card.level > 1);
    expect(levelled.length).toBe(1);
    expect(levelled[0].level).toBe(3);
    expect(state.club.coins).toBe(100);
    // 还差 = 满级仍需的金币 - 手里剩下的金币
    expect(container.textContent).toContain(
      '升到 3 级，花费 ' + (PRICE * 2).toLocaleString() + ' 金币，还差 ' + (((CAP - 3) * PRICE) - 100).toLocaleString() + ' 金币可满级',
    );
  });
});

describe('max out the squad: coins split evenly across the starting five', () => {
  it('upgrades every starter inside its own budget and spends the whole balance', () => {
    const snap = seed({ club: { ...createNewGame('Even Club').club, coins: 2000 } });
    const { container } = renderTraining();
    const button = screen.getByRole('button', { name: /一键升满全队/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('400');

    fireEvent.click(button);

    const state = useGameStore.getState();
    expect(state.club.coins).toBe(0);
    snap.cards.forEach((card) => expect(levelOf(card.templateId)).toBe(3));
    expect(container.textContent).toContain(
      '上次整队升满：5 人升级，最高 3 级，实付 ' + (2000).toLocaleString() + ' 金币',
    );
  });

  it('leaves the remainder in the bank when floor(coins / members) does not divide evenly', () => {
    const snap = seed({ club: { ...createNewGame('Odd Club').club, coins: PRICE * 5 + 30 } });
    const targets = snap.cards.map((card) => ({ templateId: card.templateId, budget: Math.floor((PRICE * 5 + 30) / 5) }));
    const result = useGameStore.getState().levelUpCards(targets);
    expect(result.ok).toBe(true);
    expect(result.upgraded).toBe(5);
    expect(result.spent).toBe(PRICE * 5);
    expect(useGameStore.getState().club.coins).toBe(30);
  });

  it('disables both buttons once the lineup and the current player are maxed', () => {
    const snap = seed({ club: { ...createNewGame('Maxed Club').club, coins: 5_000 } });
    const capXp = LEVEL_CONFIG.xpTable[CAP - 1];
    useGameStore.setState({ cards: snap.cards.map((card) => ({ ...card, level: CAP, xp: capXp })) });
    const { container } = renderTraining();
    const single = screen.getByRole('button', { name: /一键升满当前选手/ }) as HTMLButtonElement;
    const squad = screen.getByRole('button', { name: /一键升满全队/ }) as HTMLButtonElement;
    expect(single.disabled).toBe(true);
    expect(single.textContent).toContain('已满级');
    expect(squad.disabled).toBe(true);
    expect(container.textContent).toContain('首发的选手都已满级，不需要再升级。');
    fireEvent.click(squad);
    expect(useGameStore.getState().club.coins).toBe(5_000);
  });

  it('disables the button and explains why when nobody has a budget for one level', () => {
    seed({ club: { ...createNewGame('Empty Club').club, coins: 100 } });
    const { container } = renderTraining();
    const button = screen.getByRole('button', { name: /一键升满全队/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('预算不足');
    expect(container.textContent).toContain('预算不足：5 人分 100 金币，每人 20 金币，低于升级单价 ' + PRICE + ' 金币/级。');
    fireEvent.click(button);
    expect(useGameStore.getState().club.coins).toBe(100);
    expect(useGameStore.getState().cards.every((card) => card.level === 1)).toBe(true);
  });
});

describe('claim all achievements: one sweep, no side effects on a second click', () => {
  it('claims every reached achievement through claimAchievement and adds the coins', () => {
    const snap = createNewGame('Claim Club');
    seed({ club: { ...snap.club, wins: 1, badge: 'crest-1' } });
    renderAchievements();
    const coinsBefore = useGameStore.getState().club.coins;
    const button = screen.getByRole('button', { name: '一键领取全部' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    fireEvent.click(button);

    const state = useGameStore.getState();
    expect(state.claimedAchievements.sort()).toEqual(['badgeSet', 'win1']);
    expect(state.club.coins).toBe(coinsBefore + 500 + 1500);
    expect(state.toasts.some((t) => t.text === '领取 2 项，共 ' + (2000).toLocaleString() + ' 金币')).toBe(true);

    const coinsAfter = state.club.coins;
    fireEvent.click(screen.getByRole('button', { name: '一键领取全部' }));
    expect(useGameStore.getState().club.coins).toBe(coinsAfter);
    expect(useGameStore.getState().claimedAchievements.length).toBe(2);
  });

  it('pays milestone rewards through claimMilestone in the same sweep', () => {
    const snap = createNewGame('Milestone Club');
    seed({ club: { ...snap.club, wins: 100, streak: 0, badge: 'crest-1' } });
    renderAchievements();
    const coinsBefore = useGameStore.getState().club.coins;

    fireEvent.click(screen.getByRole('button', { name: '一键领取全部' }));

    const state = useGameStore.getState();
    // win1 500 + win25 3000 + win100 12000 + matches50 5000 + badgeSet 1500 + 里程碑「百胜王朝」15000
    expect(state.club.coins).toBe(coinsBefore + 37_000);
    expect(state.claimedAchievements).toContain('ms:hundred-wins');
    expect(state.toasts.some((t) => t.text === '领取 6 项，共 ' + (37_000).toLocaleString() + ' 金币')).toBe(true);
  });

  it('disables the button and says so when nothing is claimable', () => {
    const snap = seed();
    const { container } = renderAchievements();
    const button = screen.getByRole('button', { name: '一键领取全部' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.textContent).toContain('没有可领取项');
    fireEvent.click(button);
    expect(useGameStore.getState().club.coins).toBe(snap.club.coins);
  });
});
