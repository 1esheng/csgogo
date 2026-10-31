import type { MatchPlayerState, MatchState, Side, TeamState } from '@/types';
import { MATCH_CONFIG } from '@/data/config';

export function teamBySide(match: MatchState, side: Side): TeamState {
  return match.teams.A.side === side ? match.teams.A : match.teams.B;
}

export function enemySide(side: Side): Side {
  return side === 'T' ? 'CT' : 'T';
}

export function alivePlayers(team: TeamState): MatchPlayerState[] {
  return team.players.filter((p) => p.alive);
}

export function findPlayer(match: MatchState, cardInstanceId: string): MatchPlayerState | undefined {
  return match.teams.A.players.find((p) => p.cardInstanceId === cardInstanceId)
    ?? match.teams.B.players.find((p) => p.cardInstanceId === cardInstanceId);
}

export function teamOfPlayer(match: MatchState, cardInstanceId: string): TeamState | undefined {
  if (match.teams.A.players.some((p) => p.cardInstanceId === cardInstanceId)) return match.teams.A;
  if (match.teams.B.players.some((p) => p.cardInstanceId === cardInstanceId)) return match.teams.B;
  return undefined;
}

export function teamPower(team: TeamState): number {
  const alive = alivePlayers(team);
  if (!alive.length) return 0;
  return alive.reduce((acc, p) => acc + p.ovr * (p.hp / 100) * (0.6 + (p.attributes.aim / 100) * 0.4), 0) / alive.length;
}

/** Health and round counters reset; equipment (and money) carry over. */
export function resetPlayersForRound(team: TeamState): void {
  team.players.forEach((p) => {
    p.alive = true;
    p.hp = 100;
    p.roundKills = 0;
    p.roundDamage = 0;
    p.roundDealtDamageTo = {};
    p.stats.roundsPlayed += 1;
    p.equipment.armor = Math.max(0, p.equipment.armor);
  });
}

export function isRegulationOver(match: MatchState): boolean {
  return match.roundNumber >= MATCH_CONFIG.regulationRounds;
}

export function scoreOf(match: MatchState, side: Side): number {
  return teamBySide(match, side).score;
}
