import { describe, expect, it } from 'vitest';
import { AI_TEAMS } from '@/data/aiTeams';
import { lineupFromSpec, averageOvr } from '@/engine/lineup';
import { defaultBrain } from '@/engine/ai';
import { simulateAndReport } from '@/engine/simulate';
import type { MapId } from '@/types';

const MAPS: MapId[] = ['Mirage', 'Inferno', 'Nuke'];
const RUNS = 1000;

interface Bucket {
  wins: number;
  rounds: number;
  overtimes: number;
  issues: string[];
  ots: number;
}

function runBatch(
  a: ReturnType<typeof lineupFromSpec>,
  b: ReturnType<typeof lineupFromSpec>,
  seedBase: number,
): Bucket {
  const bucket: Bucket = { wins: 0, rounds: 0, overtimes: 0, issues: [], ots: 0 };
  for (let i = 0; i < RUNS; i += 1) {
    const result = simulateAndReport({
      seed: seedBase + i,
      mapId: MAPS[i % MAPS.length],
      teamA: { id: 'A', name: 'A', players: a },
      teamB: { id: 'B', name: 'B', players: b },
      brainA: defaultBrain(2),
      brainB: defaultBrain(2),
    });
    if (result.winnerSlot === 'A') bucket.wins += 1;
    bucket.rounds += result.rounds;
    if (result.overtime > 0) { bucket.overtimes += 1; bucket.ots += result.overtime; }
    if (result.issues.length) bucket.issues.push(result.issues.join('; '));
  }
  return bucket;
}

describe('long-run simulation acceptance', () => {
  it(`$RUNS even matches stay near 50% and never break`, () => {
    const spec = AI_TEAMS.find((t) => t.tier === 2)!;
    const a = lineupFromSpec(spec, 3);
    const b = lineupFromSpec(spec, 3).map((p, i) => ({ ...p, cardInstanceId: `b${i}` }));
    const bucket = runBatch(a, b, 100000);
    const winRate = bucket.wins / RUNS;
    const avgRounds = bucket.rounds / RUNS;
    // eslint-disable-next-line no-console
    console.log(`[even] winRate=${winRate.toFixed(3)} avgRounds=${avgRounds.toFixed(2)} OTs=${bucket.overtimes}`);
    expect(bucket.issues).toEqual([]);
    expect(winRate).toBeGreaterThan(0.4);
    expect(winRate).toBeLessThan(0.6);
    expect(avgRounds).toBeGreaterThan(16);
    expect(avgRounds).toBeLessThan(34);
  }, 300000);

  it(`$RUNS mismatched matches reward the stronger team`, () => {
    const strong = lineupFromSpec(AI_TEAMS.find((t) => t.id === 'navi')!, 5);
    const weak = lineupFromSpec(AI_TEAMS.find((t) => t.id === '9pandas')!, 1);
    const bucket = runBatch(strong, weak, 500000);
    const winRate = bucket.wins / RUNS;
    // eslint-disable-next-line no-console
    console.log(`[mismatch] strongOVR=${averageOvr(strong)} weakOVR=${averageOvr(weak)} winRate=${winRate.toFixed(3)} avgRounds=${(bucket.rounds / RUNS).toFixed(2)} OTs=${bucket.overtimes}`);
    expect(bucket.issues).toEqual([]);
    expect(winRate).toBeGreaterThan(0.7);
    expect(winRate).toBeLessThan(0.995);
  }, 300000);
});