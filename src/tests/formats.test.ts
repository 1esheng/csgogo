// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import { useGameStore } from '@/stores/gameStore';
import { createTournament, isEliminated, reportPlayerMatch, playerNextMatch, tournamentOutlook } from '@/game/career';

it('双败赛制：输一场不出局，输两场才淘汰', () => {
  const t0 = createTournament({ tier: 4, playerTeamName: '测试', playerRating: 1200, seed: 12345 });
  expect(t0.format).toBe('double');
  expect(t0.lossLimit).toBe(2);
  const first = playerNextMatch(t0)!;
  const afterLoss = reportPlayerMatch(t0, first.id, false, 8, 13);
  expect(afterLoss.status).toBe('active');
  expect(afterLoss.playerLosses).toBe(1);
  const second = playerNextMatch(afterLoss)!;
  const afterSecond = reportPlayerMatch(afterLoss, second.id, false, 5, 13);
  expect(afterSecond.status).toBe('completed');
  expect(afterSecond.playerLosses).toBe(2);
  expect(afterSecond.placement).toBeTruthy();
});

it('瑞士轮：三败才出局', () => {
  let t = createTournament({ tier: 9, playerTeamName: '测试', playerRating: 1700, seed: 999 });
  expect(t.format).toBe('swiss');
  expect(t.lossLimit).toBe(3);
  for (let i = 0; i < 2; i += 1) {
    const m = playerNextMatch(t)!;
    t = reportPlayerMatch(t, m.id, false, 9, 13);
    expect(t.status).toBe('active');
  }
  const last = playerNextMatch(t)!;
  t = reportPlayerMatch(t, last.id, false, 7, 13);
  expect(t.status).toBe('completed');
  expect(tournamentOutlook(t).text).toContain('名次');
});

it('单败：输一场立即出局', () => {
  const t = createTournament({ tier: 0, playerTeamName: '测试', playerRating: 1000, seed: 7 });
  expect(t.format).toBe('single');
  const m = playerNextMatch(t)!;
  const next = reportPlayerMatch(t, m.id, false, 4, 13);
  // 单败：这场输掉后你已经出局（AI 赛程由结算逻辑继续推进）
  expect(isEliminated(next)).toBe(true);
});