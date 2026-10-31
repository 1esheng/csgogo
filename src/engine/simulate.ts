import type { MatchState, MatchStatLine, MapId, TeamRoundOrders } from '@/types';
import { createMatch, isMatchOver, playRound, type LineupInput } from '@/engine/match';
import { buildScoreboard, pickMvp, validateMatch } from '@/engine/statistics';
import { decideAiOrders, type AiBrain } from '@/engine/ai';
import { Rng } from '@/engine/rng';

export interface FullMatchOptions {
  seed: number;
  mapId: MapId;
  teamA: LineupInput;
  teamB: LineupInput;
  brainA: AiBrain;
  brainB: AiBrain;
  teamAStartsT?: boolean;
}

/** Headless match: both sides driven by AI brains. Used by tests, tournaments and the league sim. */
export function runFullMatch(options: FullMatchOptions): MatchState {
  const match = createMatch({
    seed: options.seed,
    mapId: options.mapId,
    teamA: options.teamA,
    teamB: options.teamB,
    teamAStartsT: options.teamAStartsT,
  });
  const rng = new Rng(options.seed ^ 0x5f356495);
  let guard = 0;
  while (!isMatchOver(match) && guard < 80) {
    guard += 1;
    const orders: TeamRoundOrders = {
      t: decideAiOrders({ match, team: match.teams.A.side === 'T' ? match.teams.A : match.teams.B, brain: match.teams.A.side === 'T' ? options.brainA : options.brainB, rng }),
      ct: decideAiOrders({ match, team: match.teams.A.side === 'CT' ? match.teams.A : match.teams.B, brain: match.teams.A.side === 'CT' ? options.brainA : options.brainB, rng }),
    };
    playRound(match, orders);
  }
  return match;
}

export interface SimResult {
  match: MatchState;
  scoreA: number;
  scoreB: number;
  winnerId: string;
  winnerSlot: 'A' | 'B';
  rounds: number;
  overtime: number;
  scoreboard: MatchStatLine[];
  mvp: MatchStatLine | null;
  issues: string[];
}

export function simulateAndReport(options: FullMatchOptions): SimResult {
  const match = runFullMatch(options);
  const board = buildScoreboard(match);
  return {
    match,
    scoreA: match.teams.A.score,
    scoreB: match.teams.B.score,
    winnerId: match.winner === 'A' ? match.teams.A.id : match.teams.B.id,
    winnerSlot: match.winner ?? 'A',
    rounds: match.rounds.length,
    overtime: match.overtime,
    scoreboard: board,
    mvp: pickMvp(board),
    issues: validateMatch(match),
  };
}
