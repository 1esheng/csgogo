// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import { migrateCards } from '@/db/save';
import { createNewGame } from '@/game/starter';
import { AI_TEAMS } from '@/data/aiTeams';

it('旧存档的虚构对手会被换成真实战队', () => {
  const snapshot = createNewGame('迁移测试');
  snapshot.leaders = [
    { id: 'player', name: '迁移测试', isPlayer: true, rating: 1234, wins: 3, losses: 1, tier: 1 },
    { id: 'ai-nightfall', name: '夜落青训', isPlayer: false, rating: 1100, wins: 2, losses: 5, tier: 0 },
    { id: 'ai-apex', name: '极光集结', isPlayer: false, rating: 1400, wins: 9, losses: 3, tier: 4 },
  ] as never;
  const out = migrateCards(snapshot);
  expect(out.leaders.length).toBe(AI_TEAMS.length + 1);
  expect(out.leaders[0].id).toBe('player');
  expect(out.leaders[0].rating).toBe(1234);
  const names = out.leaders.map((l) => l.name);
  expect(names).not.toContain('夜落青训');
  expect(names).toContain('Natus Vincere');
  expect(names).toContain('TYLOO');
});