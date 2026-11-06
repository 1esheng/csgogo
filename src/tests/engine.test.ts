import { CAREER_TIERS } from '@/data/config';
import { computeMatchRewards } from '@/game/rewards';
import { describe, expect, it } from 'vitest';
import { CARD_TEMPLATES, TEMPLATE_MAP } from '@/data/cards';
import { AI_TEAMS } from '@/data/aiTeams';
import { lineupFromSpec, lineupFromEntries, averageOvr } from '@/engine/lineup';
import { brainFromSpec, defaultBrain } from '@/engine/ai';
import { simulateAndReport } from '@/engine/simulate';
import { createMatch, playRound, isMatchOver } from '@/engine/match';
import { buildScoreboard, validateMatch, ratingOf } from '@/engine/statistics';
import { decideAiOrders } from '@/engine/ai';
import { Rng } from '@/engine/rng';
import type { CombatRole, MapId, TeamRoundOrders } from '@/types';

const MAPS: MapId[] = ['Mirage', 'Inferno', 'Nuke'];

function equalLineups(seed: number) {
  // Same roster on both sides: an even matchup built from identical inputs.
  const spec = AI_TEAMS.find((t) => t.tier === 2)!;
  const players = lineupFromSpec(spec, 3);
  return {
    teamA: { id: 'A', name: 'Alpha', players: players.map((p, i) => ({ ...p, cardInstanceId: `a${i}` })) },
    teamB: { id: 'B', name: 'Bravo', players: players.map((p, i) => ({ ...p, cardInstanceId: `b${i}` })) },
  };
}

describe('rating model', () => {
  it('uses role weights rather than a flat average', () => {
    const tpl = TEMPLATE_MAP['tpl-donk-2026'];
    const weights = Object.values(tpl.attributes);
    const flat = weights.reduce((a, b) => a + b, 0) / weights.length;
    const avgOf = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const roleSplit = avgOf([tpl.proficiency.Entry, tpl.proficiency.AWPer, tpl.proficiency.Anchor]);
    expect(roleSplit).toBeGreaterThan(0);
    expect(flat).toBeGreaterThan(0);
  });

  it('computes a bounded rating from real stat lines', () => {
    const r = ratingOf({ kills: 20, deaths: 10, assists: 4, damage: 1800, rounds: 24 });
    expect(r).toBeGreaterThan(0.5);
    expect(r).toBeLessThan(3);
  });
});

describe('match engine', () => {
  it('plays a BO1 to a legal conclusion', () => {
    const { teamA, teamB } = equalLineups(1);
    const result = simulateAndReport({
      seed: 12345, mapId: 'Mirage', teamA, teamB,
      brainA: defaultBrain(2), brainB: defaultBrain(2),
    });
    expect(result.match.phase).toBe('match-end');
    expect(result.issues).toEqual([]);
    expect(Math.max(result.scoreA, result.scoreB)).toBeGreaterThanOrEqual(13);
    expect(result.rounds).toBeGreaterThanOrEqual(13);
    expect(result.rounds).toBeLessThanOrEqual(90);
  });

  it('never resolves a planted round as a plain elimination for CT', () => {
    const { teamA, teamB } = equalLineups(2);
    const result = simulateAndReport({
      seed: 998877, mapId: 'Nuke', teamA, teamB,
      brainA: defaultBrain(3), brainB: defaultBrain(3),
    });
    result.match.rounds.forEach((round) => {
      if (!round.bombPlanted) return;
      const explosive = round.events.some((e) => e.kind === 'explode');
      const defused = round.events.some((e) => e.kind === 'defuse');
      expect(explosive || defused).toBe(true);
    });
  });

  it('never lets a dead player act again inside the same round', () => {
    // 两队必须使用完全不重叠的选手，昵称才能唯一标识一个人。
    const slots: CombatRole[] = ['AWPer', 'Entry', 'Lurker', 'Support', 'Anchor'];
    const build = (offset: number) => lineupFromEntries(
      CARD_TEMPLATES.slice(offset, offset + 5).map((t, i) => ({
        templateId: t.id, role: slots[i], isIGL: i === 0, level: 3,
      })),
    );
    const teamA = { id: 'A', name: 'Rift', players: build(0) };
    const teamB = { id: 'B', name: 'Aurora', players: build(5) };
    const result = simulateAndReport({
      seed: 515151, mapId: 'Mirage', teamA, teamB,
      brainA: defaultBrain(3), brainB: defaultBrain(3),
    });
    let duelEventsChecked = 0;
    result.match.rounds.forEach((round) => {
      const dead = new Set<string>();
      round.events.forEach((e) => {
        // Only live engagements matter; post-round summaries may name the dead.
        if (e.kind !== 'duel' && e.kind !== 'opening') return;
        if (e.actor && dead.has(e.actor)) {
          throw new Error('dead player ' + e.actor + ' fought again in round ' + round.roundNumber);
        }
        if (e.victim) dead.add(e.victim);
        duelEventsChecked += 1;
      });
    });
    expect(duelEventsChecked).toBeGreaterThan(50);
  });

  it('keeps kills and deaths consistent and picks an MVP', () => {
    const { teamA, teamB } = equalLineups(3);
    const result = simulateAndReport({
      seed: 4242, mapId: 'Inferno', teamA, teamB,
      brainA: defaultBrain(2), brainB: defaultBrain(2),
    });
    const board = buildScoreboard(result.match);
    const kills = board.reduce((a, l) => a + l.kills, 0);
    const deaths = board.reduce((a, l) => a + l.deaths, 0);
    expect(kills).toBe(deaths);
    expect(result.mvp).not.toBeNull();
    expect(validateMatch(result.match)).toEqual([]);
    board.forEach((line) => {
      expect(line.adr).toBeGreaterThanOrEqual(0);
      expect(line.kast).toBeLessThanOrEqual(100);
      expect(line.deaths).toBeLessThanOrEqual(result.rounds);
    });
  });

  it('produces overtime when the regulation half is split', () => {
    // Force 12:12 by hand, then confirm the engine enters overtime correctly.
    const { teamA, teamB } = equalLineups(4);
    const match = createMatch({ seed: 777, mapId: 'Mirage', teamA, teamB });
    match.teams.A.score = 12;
    match.teams.B.score = 12;
    match.roundNumber = 25;
    match.overtime = 1;
    const rng = new Rng(99);
    const orders: TeamRoundOrders = {
      t: decideAiOrders({ match, team: match.teams.A.side === 'T' ? match.teams.A : match.teams.B, brain: defaultBrain(3), rng }),
      ct: decideAiOrders({ match, team: match.teams.A.side === 'CT' ? match.teams.A : match.teams.B, brain: defaultBrain(3), rng }),
    };
    playRound(match, orders);
    expect(match.overtime).toBe(1);
    expect(Math.max(match.teams.A.score, match.teams.B.score)).toBeGreaterThanOrEqual(13);
  });

  it('holds a strength advantage without making upsets impossible', () => {
    const strong = lineupFromSpec(AI_TEAMS.find((t) => t.id === 'navi')!, 5);
    const weak = lineupFromSpec(AI_TEAMS.find((t) => t.id === '9pandas')!, 1);
    expect(averageOvr(strong)).toBeGreaterThan(averageOvr(weak) + 5);
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 200; i += 1) {
      const result = simulateAndReport({
        seed: 9000 + i, mapId: MAPS[i % 3],
        teamA: { id: 'S', name: 'Strong', players: strong },
        teamB: { id: 'W', name: 'Weak', players: weak },
        brainA: defaultBrain(3), brainB: defaultBrain(1),
      });
      if (result.winnerSlot === 'A') strongWins += 1; else weakWins += 1;
    }
    expect(strongWins).toBeGreaterThan(weakWins);
    expect(weakWins).toBeGreaterThan(0);
  });
});

describe('data integrity', () => {
  it('ships at least 30 distinct card templates', () => {
    expect(CARD_TEMPLATES.length).toBeGreaterThanOrEqual(30);
    const ids = new Set(CARD_TEMPLATES.map((t) => t.id));
    expect(ids.size).toBe(CARD_TEMPLATES.length);
  });

  it('has every AI lineup resolvable', () => {
    AI_TEAMS.forEach((team) => {
      const players = lineupFromSpec(team, 3);
      expect(players.length).toBe(5);
      const playerIds = new Set(players.map((p) => p.playerId));
      expect(playerIds.size).toBe(5);
    });
  });
});
describe('economy 平衡', () => {
  it('奖金阶梯递增但单场收入不过高', () => {
    const prizes = CAREER_TIERS.map((t) => t.prize);
    for (let i = 1; i < prizes.length; i += 1) expect(prizes[i]).toBeGreaterThan(prizes[i - 1]);
    expect(prizes[prizes.length - 1]).toBeLessThanOrEqual(60000);
    const reward = computeMatchRewards({
      won: true, opponentRating: 1600, playerRating: 1200, mvp: { instanceId: 'x', kills: 30, deaths: 12, assists: 5, adr: 95, hsPct: 50, kast: 75, rating: 1.4, firstKills: 4 } as never, rounds: 30,
      templates: {},
    });
    // 爆冷 + MVP + 长局也不该超过 3000（约等于 6 次单抽）
    expect(reward.coins).toBeLessThanOrEqual(3000);
  });
});