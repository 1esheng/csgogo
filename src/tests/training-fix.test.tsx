// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGameStore, type GameStore } from '@/stores/gameStore';
import { clearDatabase } from '@/db/db';
import { createNewGame } from '@/game/starter';
import { RosterTraining, planSquadTraining } from '@/features/training/RosterTraining';
import { LEVEL_CONFIG, TRAINING_DRILLS } from '@/data/config';

const AIM = TRAINING_DRILLS[0];
const SCRIM = TRAINING_DRILLS.find((d) => d.id === 'scrim')!;
const EMPTY_SQUAD = {
  slots: { AWPer: null, Entry: null, Lurker: null, Support: null, Anchor: null },
  igl: null,
  synergy: 0,
  matchesTogether: 0,
};

function seed(overrides: Partial<GameStore> = {}) {
  const snap = createNewGame('Training Fix Club');
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
    celebration: null,
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

function pickerRows(dialog: HTMLElement): HTMLElement[] {
  return within(dialog).getAllByRole('button').filter((node) => node.hasAttribute('aria-pressed'));
}

function rowNickname(row: HTMLElement): string {
  return row.querySelector('[data-testid="entry-nickname"]')?.textContent ?? '';
}

beforeEach(async () => {
  await clearDatabase();
});

afterEach(() => cleanup());

describe('squad training plan: one source of truth for cost and headcount', () => {
  it('prices the full squad from unique starters at the drill price', () => {
    const snap = seed();
    const plan = planSquadTraining({
      cards: useGameStore.getState().cards,
      templates: useGameStore.getState().templates(),
      slots: snap.squad.slots,
      drillId: 'aim',
      coins: 5000,
    });
    expect(plan.lineup).toBe(5);
    expect(plan.members).toBe(5);
    expect(plan.perCost).toBe(AIM.cost);
    expect(plan.fullCost).toBe(AIM.cost * 5);
    expect(plan.affordable).toBe(5);
    expect(plan.cost).toBe(AIM.cost * 5);
    expect(plan.mode).toBe('full');
  });

  it('reports a partial plan when coins only cover some starters', () => {
    const snap = seed();
    const plan = planSquadTraining({
      cards: useGameStore.getState().cards,
      templates: useGameStore.getState().templates(),
      slots: snap.squad.slots,
      drillId: 'aim',
      coins: AIM.cost * 3 + 10,
    });
    expect(plan.members).toBe(5);
    expect(plan.affordable).toBe(3);
    expect(plan.cost).toBe(AIM.cost * 3);
    expect(plan.fullCost).toBe(AIM.cost * 5);
    expect(plan.mode).toBe('partial');
  });

  it('reports the plan as unaffordable when coins cannot cover one starter', () => {
    const snap = seed();
    const plan = planSquadTraining({
      cards: useGameStore.getState().cards,
      templates: useGameStore.getState().templates(),
      slots: snap.squad.slots,
      drillId: 'aim',
      coins: AIM.cost - 1,
    });
    expect(plan.affordable).toBe(0);
    expect(plan.cost).toBe(0);
    expect(plan.mode).toBe('short');
  });

  it('counts a duplicated template id once even when it fills two slots', () => {
    const snap = seed();
    // 让 Entry 槽位指向与 AWPer 相同的卡牌：同名卡重复上场只算一次训练
    const slots = { ...snap.squad.slots, Entry: snap.squad.slots.AWPer };
    const plan = planSquadTraining({
      cards: useGameStore.getState().cards,
      templates: useGameStore.getState().templates(),
      slots,
      drillId: 'aim',
      coins: 5000,
    });
    expect(plan.lineup).toBe(5);
    expect(plan.members).toBe(4);
    expect(plan.fullCost).toBe(AIM.cost * 4);
    expect(plan.mode).toBe('full');
  });

  it('leaves maxed starters out of the price', () => {
    const snap = seed();
    const capXp = LEVEL_CONFIG.xpTable[LEVEL_CONFIG.maxLevel - 1];
    const cards = snap.cards.map((card, index) => (
      index === 0 ? { ...card, level: LEVEL_CONFIG.maxLevel, xp: capXp } : card
    ));
    const plan = planSquadTraining({
      cards,
      templates: useGameStore.getState().templates(),
      slots: snap.squad.slots,
      drillId: 'aim',
      coins: 5000,
    });
    expect(plan.lineup).toBe(5);
    expect(plan.members).toBe(4);
    expect(plan.fullCost).toBe(AIM.cost * 4);
  });

  it('marks a fully maxed lineup as capped instead of charging for nothing', () => {
    const snap = seed();
    const capXp = LEVEL_CONFIG.xpTable[LEVEL_CONFIG.maxLevel - 1];
    const cards = snap.cards.map((card) => ({ ...card, level: LEVEL_CONFIG.maxLevel, xp: capXp }));
    const plan = planSquadTraining({
      cards,
      templates: useGameStore.getState().templates(),
      slots: snap.squad.slots,
      drillId: 'aim',
      coins: 5000,
    });
    expect(plan.members).toBe(0);
    expect(plan.mode).toBe('capped');
  });
});

describe('training page hook order (no hooks after a conditional return)', () => {
  it('renders a club that owns no cards', () => {
    seed({ cards: [], squad: EMPTY_SQUAD });
    const { container } = renderTraining();
    expect(container.textContent).toContain('还没有可训练的卡牌');
  });

  it('survives the first card arriving after the empty render', () => {
    const snap = seed({ cards: [], squad: EMPTY_SQUAD });
    const { container } = renderTraining();
    expect(container.textContent).toContain('还没有可训练的卡牌');
    act(() => {
      useGameStore.setState({ cards: snap.cards });
    });
    expect(container.textContent).not.toContain('还没有可训练的卡牌');
    expect(container.textContent).toContain('现在阵容');
  });

  it('shows an empty search result, then restores the list when the search is cleared', () => {
    seed();
    const { container } = renderTraining();
    expect(container.textContent).toContain('收藏');
    fireEvent.change(screen.getByPlaceholderText('搜索选手'), { target: { value: '没有这名选手' } });
    expect(container.textContent).toContain('没有符合搜索条件的卡牌');
    fireEvent.click(screen.getByRole('button', { name: '清空搜索' }));
    expect(container.textContent).not.toContain('没有符合搜索条件的卡牌');
    const input = screen.getByPlaceholderText('搜索选手') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(container.textContent).toContain('名选手');
  });
});

describe('single-player training feedback', () => {
  it('charges one drill price and celebrates the level-up', () => {
    seed();
    const nearLevel = LEVEL_CONFIG.xpTable[1] - 1;
    useGameStore.setState({
      cards: useGameStore.getState().cards.map((card) => ({ ...card, level: 1, xp: nearLevel })),
    });
    const coinsBefore = useGameStore.getState().club.coins;
    renderTraining();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(SCRIM.label) }));
    const state = useGameStore.getState();
    expect(state.club.coins).toBe(coinsBefore - SCRIM.cost);
    expect(state.training.length).toBe(1);
    expect(state.celebration).not.toBeNull();
    expect(state.celebration!.tone).toBe('level');
    expect(state.celebration!.title).toContain('升到');
  });
});

describe('squad training button: copy, availability and reported result agree', () => {
  it('shows the partial total up front and reports the real headcount and spend', () => {
    const snap = seed({ club: { ...createNewGame('Coins Club').club, coins: AIM.cost * 3 + 10 } });
    const { container } = renderTraining();
    expect(container.textContent).toContain('金币不足，本次只能训练 3 / 5 人，花费 ' + (AIM.cost * 3) + ' 金币，剩余 2 人未训练。');
    const button = screen.getByRole('button', { name: new RegExp('训练 3 人') });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button);
    const state = useGameStore.getState();
    expect(state.training.length).toBe(3);
    expect(state.club.coins).toBe(10);
    expect(container.textContent).toContain('上次整队训练：3 / 5 人 · 实付 ' + (AIM.cost * 3) + ' 金币');
    expect(snap.cards.length).toBe(state.cards.length);
  });

  it('previews the full-squad total when coins cover every starter', () => {
    seed({ club: { ...createNewGame('Rich Club').club, coins: 5000 } });
    const { container } = renderTraining();
    expect(container.textContent).toContain('可完整训练全队 5 人，共 ' + (AIM.cost * 5) + ' 金币。');
    expect(screen.getByRole('button', { name: new RegExp('一键训练全队') }).textContent).toContain(String(AIM.cost * 5));
  });

  it('disables the button and explains why when coins cannot cover one starter', () => {
    seed({ club: { ...createNewGame('Broke Club').club, coins: AIM.cost - 1 } });
    const { container } = renderTraining();
    const button = screen.getByRole('button', { name: new RegExp('一键训练全队') }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.textContent).toContain('金币不足，连一名首发都训练不了');
    fireEvent.click(button);
    expect(useGameStore.getState().training.length).toBe(0);
  });
});

describe('mobile compact player picker', () => {
  it('keeps the current player on top and collapses the compact list after selecting', () => {
    seed();
    renderTraining();
    const bar = screen.getByTestId('training-current-player');
    expect(bar.textContent).toContain('当前选手');

    fireEvent.click(screen.getByRole('button', { name: '换人' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('选择选手');
    const rows = pickerRows(dialog);
    expect(rows.length).toBe(5);

    // 弹层里可以单独搜索
    fireEvent.change(within(dialog).getByPlaceholderText('搜索选手'), { target: { value: '没有这名选手' } });
    expect(within(dialog).getByText('没有符合搜索条件的卡牌')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '清空搜索' }));
    expect(pickerRows(dialog).length).toBe(5);

    const before = bar.textContent ?? '';
    const target = pickerRows(dialog)[1];
    const targetName = rowNickname(target);
    expect(targetName.length).toBeGreaterThan(0);
    expect(before).not.toContain(targetName);
    fireEvent.click(target);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('training-current-player').textContent).toContain(targetName);
  });
});
