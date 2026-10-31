import type {
  AITeamSpec, BuyType, MatchState, MapId, RoundOrders, Side, TeamState,
} from '@/types';
import { decideBuy } from '@/engine/economy';
import type { Rng } from '@/engine/rng';

export interface AiBrain {
  id: string;
  tTactics: string[];
  ctTactics: string[];
  econStyle: 'conservative' | 'balanced' | 'aggressive';
  adaptivity: number;
  mapPref: MapId[];
}

export function brainFromSpec(spec: AITeamSpec): AiBrain {
  return {
    id: spec.id,
    tTactics: spec.tTactics,
    ctTactics: spec.ctTactics,
    econStyle: spec.econStyle,
    adaptivity: spec.adaptivity,
    mapPref: spec.mapPref,
  };
}

export function defaultBrain(tier = 1): AiBrain {
  return {
    id: `brain-t${tier}`,
    tTactics: ['default', 'slow_execute', 'fast_rush'],
    ctTactics: ['standard_defense', 'passive_hold'],
    econStyle: 'balanced',
    adaptivity: Math.min(0.9, 0.25 + tier * 0.12),
    mapPref: ['Mirage', 'Inferno', 'Nuke'],
  };
}

/** Rotate away from a tactic that just failed twice — adaptivity gated so weak AI stays predictable. */
function adaptTactic(pool: string[], recent: { tactic: string; won: boolean }[], adaptivity: number, rng: Rng): string {
  if (!pool.length) return 'default';
  if (recent.length >= 2 && adaptivity > 0.3) {
    const lastTwo = recent.slice(-2);
    if (lastTwo.every((r) => !r.won)) {
      const alternatives = pool.filter((t) => t !== lastTwo[lastTwo.length - 1].tactic);
      if (alternatives.length && rng.chance(adaptivity)) return rng.pick(alternatives);
    }
  }
  const weights = pool.map((t) => ({ value: t, weight: 1 }));
  return rng.weighted(weights);
}

/** Counters that do not peek at future rolls — only at tactics already played. */
function counterChoice(enemyTactic: string, pool: string[], adaptivity: number, rng: Rng): string | null {
  if (!rng.chance(adaptivity)) return null;
  const has = (t: string) => pool.includes(t);
  if (enemyTactic === 'stack_site' && (has('split_attack') || has('fake_execute'))) {
    return rng.chance(0.6) && has('split_attack') ? 'split_attack' : 'fake_execute';
  }
  if (enemyTactic === 'passive_hold' && has('slow_execute')) return 'slow_execute';
  if (enemyTactic === 'aggressive_push' && has('default')) return 'default';
  if ((enemyTactic === 'retake_setup') && has('fast_rush')) return 'fast_rush';
  if (enemyTactic === 'fast_rush' && has('passive_hold')) return 'passive_hold';
  if (enemyTactic === 'slow_execute' && has('stack_site')) return 'stack_site';
  return null;
}

export interface AiOrderInput {
  match: MatchState;
  team: TeamState;
  brain: AiBrain;
  rng: Rng;
  opponentBrain?: AiBrain;
}

export function decideAiOrders(input: AiOrderInput): RoundOrders {
  const { match, team, brain, rng } = input;
  const side: Side = team.side;
  const buy: BuyType = decideBuy(team, match.roundNumber, match.overtime, brain.econStyle);

  const pool = side === 'T' ? brain.tTactics : brain.ctTactics;
  const myTacticHistory = inferHistory(match, team.id, side);
  const enemyHistory = inferHistory(match, otherTeamId(match, team.id), side === 'T' ? 'CT' : 'T');
  const lastEnemy = enemyHistory.length ? enemyHistory[enemyHistory.length - 1].tactic : '';

  const counter = counterChoice(lastEnemy, pool, brain.adaptivity, rng);
  const tactic = counter ?? adaptTactic(pool, myTacticHistory, brain.adaptivity, rng);

  let target: RoundOrders['target'] = 'AUTO';
  if (side === 'T') {
    const preference = brain.mapPref[0];
    void preference;
    const weights = [
      { value: 'A' as const, weight: 1 },
      { value: 'B' as const, weight: 1 },
    ];
    if (tactic === 'fake_execute' || tactic === 'split_attack') {
      target = rng.chance(0.5) ? 'A' : 'B';
    } else {
      target = rng.weighted(weights);
    }
  }
  return { side, buy, tactic, target };
}

function otherTeamId(match: MatchState, teamId: string): string {
  return match.teams.A.id === teamId ? match.teams.B.id : match.teams.A.id;
}

/** Reconstructs which tactic each side used in past rounds from the event log. */
function inferHistory(match: MatchState, teamId: string, side: Side): { tactic: string; won: boolean }[] {
  const out: { tactic: string; won: boolean }[] = [];
  const names = side === 'T'
    ? /^T calls (.+?):/
    : /^CT sets up (.+?):/;
  match.rounds.forEach((r) => {
    const relevant = r.events.find((e) => names.test(e.text) && e.side === side);
    if (!relevant) return;
    const m = relevant.text.match(names);
    if (!m) return;
    const tacticName = m[1];
    const tacticId = tacticIdFromName(tacticName);
    out.push({ tactic: tacticId, won: r.winner === side });
  });
  void teamId;
  return out;
}

const NAME_TO_ID: Record<string, string> = {
  'Fast Rush': 'fast_rush',
  Default: 'default',
  'Slow Execute': 'slow_execute',
  'Mid Control': 'mid_control',
  'Fake Execute': 'fake_execute',
  'Split Attack': 'split_attack',
  'Standard Defense': 'standard_defense',
  'Aggressive Push': 'aggressive_push',
  'Passive Hold': 'passive_hold',
  'Stack Site': 'stack_site',
  'Retake Setup': 'retake_setup',
};

export function tacticIdFromName(name: string): string {
  return NAME_TO_ID[name] ?? 'default';
}
