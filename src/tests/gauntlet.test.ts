// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import { useGameStore } from '@/stores/gameStore';
import { createTournament, isEliminated, playerNextMatch, reportPlayerMatch, simulateAiMatch } from '@/game/career';

it('双败：输一场后仍可继续比赛，且能正常收尾', () => {
  const t0 = createTournament({ tier: 5, playerTeamName: '测试', playerRating: 1400, seed: 4242 });
  const first = playerNextMatch(t0)!;
  const afterLoss = reportPlayerMatch(t0, first.id, false, 9, 13);
  expect(isEliminated(afterLoss)).toBe(false);          // 关键：不再误判出局
  expect(afterLoss.status).toBe('active');
  const next = playerNextMatch(afterLoss);
  expect(next).not.toBeNull();                          // 还有下一场可打
  const afterSecond = reportPlayerMatch(afterLoss, next!.id, false, 7, 13);
  expect(isEliminated(afterSecond)).toBe(true);
  expect(afterSecond.status).toBe('completed');
  expect(afterSecond.placement).toBeTruthy();
});

it('瑞士轮：赢够场次可以夺冠', () => {
  let t = createTournament({ tier: 9, playerTeamName: '测试', playerRating: 1700, seed: 777 });
  for (let i = 0; i < t.winsNeeded; i += 1) {
    const m = playerNextMatch(t);
    if (!m) break;
    t = reportPlayerMatch(t, m.id, true, 13, 6);
  }
  expect(t.status).toBe('completed');
  expect(t.championId).toBe('player');
  void simulateAiMatch;
});