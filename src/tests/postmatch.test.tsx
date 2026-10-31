// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PostMatch } from '@/features/matches/PostMatch';
import type { MatchSummary } from '@/types';

const base: MatchSummary = {
  id: 'm1', mapId: 'Mirage', playedAt: Date.now(), opponentName: '对手', teamName: '我方',
  scoreFor: 13, scoreAgainst: 8, won: true, roundsPlayed: 21, seed: 1,
  scoreboard: [], mvp: null, coins: 420, xp: 120, keyRounds: [], mode: 'tournament',
  tournamentId: 't1',
};

it('生涯/赛事对局结束后回到生涯，自由对局才回赛前准备', () => {
  const career = render(<MemoryRouter><PostMatch summary={base} onExit={() => {}} /></MemoryRouter>);
  expect(career.container.textContent).toContain('返回生涯');
  expect(career.container.textContent).not.toContain('返回赛前准备');
  cleanup();
  const quick = render(<MemoryRouter><PostMatch summary={{ ...base, mode: 'quick', tournamentId: undefined }} onExit={() => {}} /></MemoryRouter>);
  expect(quick.container.textContent).toContain('返回赛前准备');
  expect(quick.container.textContent).not.toContain('返回生涯');
  cleanup();
});