// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { MAP_IDS, type MapId } from '@/types';
import {
  applyVetoChoice, createVeto, currentVetoStep, isVetoComplete, undoVetoChoice,
  vetoBanned, vetoPicked, vetoResultMap, vetoSteps, type VetoFormat, type VetoSide,
} from '@/game/veto';
import { VetoPanel } from '@/features/matches/VetoPanel';
import { Setup } from '@/features/matches/Setup';
import { MemoryRouter } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';

/** 每次都点当前剩下的第一张，走完整个 BP。 */
function walk(format: VetoFormat, firstSide: VetoSide) {
  let state = createVeto(MAP_IDS, format, firstSide);
  const remaining: number[] = [state.remaining.length];
  const taken: MapId[] = [];
  while (currentVetoStep(state)) {
    const next = state.remaining[0];
    const result = applyVetoChoice(state, next);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    state = result.state;
    taken.push(next);
    remaining.push(state.remaining.length);
  }
  return { state, remaining, taken };
}

describe('veto 序列', () => {
  it('BO1 是六次 BAN，双方严格交替', () => {
    const steps = vetoSteps('BO1', 'us');
    expect(steps).toHaveLength(6);
    expect(steps.map((s) => s.action)).toEqual(['ban', 'ban', 'ban', 'ban', 'ban', 'ban']);
    expect(steps.map((s) => s.side)).toEqual(['us', 'them', 'us', 'them', 'us', 'them']);
    // 先手换人，序列跟着镜像
    expect(vetoSteps('BO1', 'them').map((s) => s.side)).toEqual(['them', 'us', 'them', 'us', 'them', 'us']);
  });

  it('BO3 是 ban,ban,pick,pick,ban,ban 且交替出手', () => {
    const steps = vetoSteps('BO3', 'us');
    expect(steps).toHaveLength(6);
    expect(steps.map((s) => s.action)).toEqual(['ban', 'ban', 'pick', 'pick', 'ban', 'ban']);
    expect(steps.map((s) => s.side)).toEqual(['us', 'them', 'us', 'them', 'us', 'them']);
    expect(steps.filter((s) => s.action === 'pick').map((s) => s.side)).toEqual(['us', 'them']);
  });
});

describe('veto 推进', () => {
  it('BO1 每步只移除一张，最后只剩一张决胜图', () => {
    const { state, remaining, taken } = walk('BO1', 'us');
    expect(remaining).toEqual([7, 6, 5, 4, 3, 2, 1]);
    expect(taken).toHaveLength(6);
    expect(new Set(taken).size).toBe(6);
    expect(state.remaining).toHaveLength(1);
    expect(vetoResultMap(state)).toBe(state.remaining[0]);
    expect(isVetoComplete(state)).toBe(true);
    expect(currentVetoStep(state)).toBeNull();
    expect(vetoPicked(state)).toEqual([]);
    expect(vetoBanned(state)).toHaveLength(6);
  });

  it('BO3 留下两张 PICK 和一张决胜图', () => {
    const { state, remaining } = walk('BO3', 'them');
    expect(remaining).toEqual([7, 6, 5, 4, 3, 2, 1]);
    expect(vetoPicked(state)).toHaveLength(2);
    expect(vetoBanned(state)).toHaveLength(4);
    expect(state.remaining).toHaveLength(1);
    expect(vetoResultMap(state)).toBe(state.remaining[0]);
  });

  it('未结束时不给出决胜图', () => {
    const state = createVeto(MAP_IDS, 'BO1', 'us');
    expect(vetoResultMap(state)).toBeNull();
    expect(isVetoComplete(state)).toBe(false);
  });

  it('非法选择被拒绝：重复点同一张、池外地图、结束之后', () => {
    const start = createVeto(MAP_IDS, 'BO1', 'us');
    const first = applyVetoChoice(start, 'Mirage');
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.error);
    // 原状态不被就地改写
    expect(start.remaining).toHaveLength(7);

    const again = applyVetoChoice(first.state, 'Mirage');
    expect(again.ok).toBe(false);
    if (again.ok) throw new Error('重复选图不该通过');
    expect(again.error.length).toBeGreaterThan(0);

    // 池子里没有这张图
    const small = createVeto(MAP_IDS.slice(0, 3), 'BO1', 'us');
    expect(applyVetoChoice(small, 'Train').ok).toBe(false);

    // BP 结束后不再接受任何操作
    const { state: finished } = walk('BO1', 'us');
    expect(applyVetoChoice(finished, finished.remaining[0]).ok).toBe(false);
  });

  it('撤销一步把地图按原池顺序放回去', () => {
    let state = createVeto(MAP_IDS, 'BO3', 'us');
    for (const id of ['Mirage', 'Inferno', 'Nuke'] as MapId[]) {
      const result = applyVetoChoice(state, id);
      if (!result.ok) throw new Error(result.error);
      state = result.state;
    }
    expect(state.remaining).toHaveLength(4);
    const back = undoVetoChoice(state);
    expect(back.entries).toHaveLength(2);
    expect(back.remaining).toHaveLength(5);
    // 放回去以后剩余池仍是原池顺序
    expect(back.remaining).toEqual(['Nuke', 'Ancient', 'Anubis', 'Dust2', 'Train']);
    // 已经清空时撤销是空操作
    expect(undoVetoChoice(createVeto(MAP_IDS, 'BO1', 'us')).entries).toHaveLength(0);
  });
});

describe('VetoPanel', () => {
  const cards = (container: HTMLElement) => [...container.querySelectorAll<HTMLButtonElement>('button[data-veto-map]')];
  const chip = (container: HTMLElement, label: string) =>
    [...container.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === label)!;

  it('BO1 点满六张后回填唯一剩下的决胜图', () => {
    const decided: MapId[] = [];
    const { container } = render(
      <VetoPanel pool={MAP_IDS} comfort={{ Mirage: 42 }} onResolve={(id) => decided.push(id)} />,
    );
    expect(cards(container)).toHaveLength(7);
    expect(container.textContent).toContain('步骤 1 / 6');
    expect(container.textContent).toContain('我方 BAN');

    for (let i = 0; i < 6; i += 1) {
      const next = cards(container).find((b) => !b.disabled)!;
      expect(next).toBeTruthy();
      fireEvent.click(next);
    }

    expect(decided).toEqual([MAP_IDS[6]]);
    expect(container.textContent).toContain('BP 结束');
    // 六张置灰划线，剩下一张戴决胜图标识
    expect(cards(container).every((b) => b.disabled)).toBe(true);
    expect(container.textContent).toContain('决胜图');
    expect(cards(container)[0].textContent).toContain('已 BAN');
    cleanup();
  });

  it('切到 BO3 后推演，两次 PICK 打勾、其余 BAN 划线', () => {
    const decided: MapId[] = [];
    const { container } = render(
      <VetoPanel pool={MAP_IDS} comfort={{}} onResolve={(id) => decided.push(id)} />,
    );
    fireEvent.click(chip(container, 'BO3'));
    expect(container.textContent).toContain('步骤 1 / 6');

    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(cards(container).find((b) => !b.disabled)!);
      if (i === 1) expect(container.textContent).toContain('我方 PICK');
      if (i === 2) expect(container.textContent).toContain('对手 PICK');
    }

    expect(decided).toEqual([MAP_IDS[6]]);
    const pickedCards = cards(container).filter((b) => (b.textContent || '').includes('已 PICK'));
    expect(pickedCards).toHaveLength(2);
    expect(pickedCards.map((b) => b.dataset.vetoMap)).toEqual([MAP_IDS[2], MAP_IDS[3]]);
    cleanup();
  });

  it('Setup 切到 Veto 演练并走完 BP 后把决胜图回填进选图', async () => {
    await useGameStore.getState().newGame('BP 演练');
    const { container } = render(<MemoryRouter><Setup /></MemoryRouter>);
    expect(container.textContent).not.toContain('Ivy');
    // 默认还是快速选图：7 张图直接可选，没有 BP 面板
    expect(container.querySelectorAll('button[data-veto-map]')).toHaveLength(0);

    fireEvent.click(chip(container, 'Veto 演练'));
    expect(cards(container)).toHaveLength(7);
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(cards(container).find((b) => !b.disabled)!);
    }

    expect(container.textContent).toContain('BP 结束');
    // Train 的 A 点只在选中该图时渲染，出现即代表 selectedMap 已回填
    expect(container.textContent).toContain('Ivy');
    cleanup();
  });

  it('对手先手时第一步就轮到对手', () => {
    const { container } = render(<VetoPanel pool={MAP_IDS} comfort={{}} onResolve={() => {}} />);
    fireEvent.click(chip(container, '对手先手'));
    expect(container.textContent).toContain('步骤 1 / 6');
    expect(container.textContent).toContain('对手 BAN');
    cleanup();
  });
});
