// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CoachPage } from '@/pages/CoachPage';
import { Setup } from '@/features/matches/Setup';
import { useGameStore } from '@/stores/gameStore';
import { clearDatabase } from '@/db/db';
import { validateSnapshot } from '@/db/save';
import { COACH_MAP } from '@/data/coaches';
import {
  COACH_GROWTH, coachLevel, coachXpProgress, createNewGame, grownCoach, grownCoachAbility, ownedCoachXp,
} from '@/game/starter';

describe('tactic defaults and coach growth', () => {
  beforeEach(async () => {
    await clearDatabase();
    useGameStore.setState({ activeMatch: null, activeMatchInfo: null, playerOrders: null, lastSummary: null });
  });

  it('starts new saves with an empty tactic default table and coach xp table', () => {
    const fresh = createNewGame('Save Fields');
    expect(fresh.tacticDefaults).toEqual({});
    expect(fresh.coachXp).toEqual({});
  });

  it('writes per-map default tactics into the save and clears them again', async () => {
    await useGameStore.getState().newGame('Tactic Club');
    useGameStore.getState().setDefaultTactic('Mirage', 'slow_execute');
    expect(useGameStore.getState().snapshot().tacticDefaults).toEqual({ Mirage: 'slow_execute' });

    useGameStore.getState().setDefaultTactic('Inferno', 'mid_control');
    expect(useGameStore.getState().snapshot().tacticDefaults).toEqual({ Mirage: 'slow_execute', Inferno: 'mid_control' });

    useGameStore.getState().setDefaultTactic('Mirage', '');
    expect(useGameStore.getState().snapshot().tacticDefaults).toEqual({ Inferno: 'mid_control' });
  });

  it('falls back to empty tables for saves written before the fields existed', () => {
    const raw = JSON.parse(JSON.stringify(createNewGame('Legacy Club'))) as Record<string, unknown>;
    delete raw.tacticDefaults;
    delete raw.coachXp;
    const result = validateSnapshot(raw);
    expect(result.ok).toBe(true);
    expect(result.snapshot!.tacticDefaults).toEqual({});
    expect(result.snapshot!.coachXp).toEqual({});
  });

  it('drops malformed tactic defaults and coach xp values while loading', () => {
    const raw = JSON.parse(JSON.stringify(createNewGame('Broken Fields'))) as Record<string, unknown>;
    raw.tacticDefaults = { Mirage: 'slow_execute', Atlantis: 'fast_rush', Nuke: 12 };
    raw.coachXp = { 'coach-1': 210, 'coach-2': -40, 'coach-3': 'oops' };
    const result = validateSnapshot(raw);
    expect(result.ok).toBe(true);
    expect(result.snapshot!.tacticDefaults).toEqual({ Mirage: 'slow_execute' });
    expect(result.snapshot!.coachXp).toEqual({ 'coach-1': 210 });
  });

  it('grows a coach one ability point per 100 xp, capped at 99', () => {
    expect(coachLevel(0)).toBe(0);
    expect(coachLevel(99)).toBe(0);
    expect(coachLevel(250)).toBe(2);
    expect(coachXpProgress(250)).toEqual({ level: 2, into: 50, need: 100 });

    expect(grownCoachAbility(84, 0)).toBe(84);
    expect(grownCoachAbility(84, 250)).toBe(86);
    expect(grownCoachAbility(99, 5000)).toBe(COACH_GROWTH.abilityCap);

    expect(ownedCoachXp({ instanceId: 'c1', coachId: 'kane', xp: 30 }, { c1: 120 })).toBe(120);
    expect(ownedCoachXp({ instanceId: 'c1', coachId: 'kane', xp: 130 }, { c1: 20 })).toBe(130);
    expect(ownedCoachXp(null, { c1: 90 })).toBe(0);

    const base = COACH_MAP.kane;
    const grown = grownCoach(base, 300);
    expect(grown!.ability).toBe(Math.min(COACH_GROWTH.abilityCap, base.ability + 3));
    expect(base.ability).toBe(83);
  });

  it('awards head coach xp after an official match but not after a friendly', async () => {
    await useGameStore.getState().newGame('Coach Club');
    useGameStore.setState({ coaches: [{ instanceId: 'coach-1', coachId: 'kane', xp: 0 }], headCoachId: 'coach-1', coachXp: {} });

    useGameStore.getState().startMatch({ mapId: 'Mirage', opponentId: 'liquid', mode: 'career' });
    useGameStore.getState().autoPlay();
    const afterOfficial = useGameStore.getState();
    const gained = afterOfficial.coachXp['coach-1'] ?? 0;
    expect([18, 12]).toContain(gained);
    expect(afterOfficial.coaches[0].xp).toBe(gained);

    useGameStore.getState().startMatch({ mapId: 'Mirage', opponentId: 'liquid', mode: 'quick' });
    useGameStore.getState().autoPlay();
    expect(useGameStore.getState().coachXp['coach-1']).toBe(gained);
  });

  it('renders the coach level, xp progress and the map default tactic link', async () => {
    await useGameStore.getState().newGame('UI Club');
    useGameStore.setState({
      coaches: [{ instanceId: 'coach-1', coachId: 'kane', xp: 250 }],
      headCoachId: 'coach-1',
      coachXp: { 'coach-1': 250 },
      tacticDefaults: { Mirage: 'slow_execute' },
    });

    const coachText = render(<MemoryRouter><CoachPage /></MemoryRouter>).container.textContent ?? '';
    expect(coachText).toContain('2 级');
    expect(coachText).toContain('50/100');
    // kane 基础 83 + 2 级成长 = 85
    expect(coachText).toContain('85');
    cleanup();

    const setupText = render(<MemoryRouter><Setup /></MemoryRouter>).container.textContent ?? '';
    expect(setupText).toContain('进攻战术预设');
    expect(setupText).toContain('该图默认：慢打执行');
    expect(setupText).toContain('取消该图默认');
  });

  it('opens the match with the map default tactic on the T side', async () => {
    await useGameStore.getState().newGame('Tactic Match');
    useGameStore.getState().setDefaultTactic('Mirage', 'slow_execute');

    const tSideTactic = (opts?: { tactic?: string }): string | null => {
      for (let i = 0; i < 12; i += 1) {
        useGameStore.getState().startMatch({ mapId: 'Mirage', opponentId: 'liquid', mode: 'tactical', tactic: opts?.tactic });
        const s = useGameStore.getState();
        if (s.activeMatch?.teams.A.side === 'T') return s.playerOrders?.tactic ?? null;
      }
      return null;
    };

    expect(tSideTactic()).toBe('slow_execute');
    expect(tSideTactic({ tactic: 'fast_rush' })).toBe('fast_rush');

    useGameStore.getState().setDefaultTactic('Mirage', 'not_a_tactic');
    expect(tSideTactic()).toBe('default');
  });
});
