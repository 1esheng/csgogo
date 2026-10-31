import type { MatchState, MatchStatLine, TeamState } from '@/types';

/** In-game rating approximation, fully derived from simulated events. */
export function ratingOf(line: { kills: number; deaths: number; assists: number; damage: number; rounds: number }): number {
  if (line.rounds <= 0) return 0;
  const kpr = line.kills / line.rounds;
  const dpr = line.deaths / line.rounds;
  const adr = line.damage / line.rounds;
  const impact = (line.assists / line.rounds) * 0.25;
  const raw = 0.35 + (kpr / 0.72) * 0.42 + (adr / 82) * 0.36 + (kpr - dpr) * 0.18 + impact;
  return Math.round(Math.max(0, raw) * 100) / 100;
}

export function kastPercent(kastRounds: number, rounds: number): number {
  if (rounds <= 0) return 0;
  return Math.round((kastRounds / rounds) * 1000) / 10;
}

export function buildScoreboard(match: MatchState): MatchStatLine[] {
  const lines: MatchStatLine[] = [];
  ([match.teams.A, match.teams.B] as TeamState[]).forEach((team) => {
    team.players.forEach((p) => {
      const rounds = p.stats.roundsPlayed || Math.max(1, match.rounds.length);
      lines.push({
        cardInstanceId: p.cardInstanceId,
        playerId: p.playerId,
        nickname: p.nickname,
        teamId: team.id,
        side: team.side,
        kills: p.stats.kills,
        deaths: p.stats.deaths,
        assists: p.stats.assists,
        damage: p.stats.damage,
        rounds,
        adr: Math.round((p.stats.damage / rounds) * 10) / 10,
        kast: kastPercent(p.stats.kastRounds, rounds),
        kd:  Math.round((p.stats.kills / Math.max(1, p.stats.deaths)) * 100) / 100,
        rating: ratingOf({ kills: p.stats.kills, deaths: p.stats.deaths, assists: p.stats.assists, damage: p.stats.damage, rounds }),
        openingKills: p.stats.openingKills,
        openingDeaths: p.stats.openingDeaths,
        multiKills: p.stats.multiKills,
        clutches: p.stats.clutches,
      });
    });
  });
  return lines.sort((a, b) => b.rating - a.rating);
}

export function pickMvp(lines: MatchStatLine[]): MatchStatLine | null {
  if (!lines.length) return null;
  return [...lines].sort((a, b) => b.rating - a.rating)[0];
}

export function teamTotals(match: MatchState, teamId: string): { kills: number; deaths: number; damage: number } {
  const lines = buildScoreboard(match).filter((l) => l.teamId === teamId);
  return {
    kills: lines.reduce((a, l) => a + l.kills, 0),
    deaths: lines.reduce((a, l) => a + l.deaths, 0),
    damage: lines.reduce((a, l) => a + l.damage, 0),
  };
}

/** Consistency checks used by the automated acceptance tests. */
export function validateMatch(match: MatchState): string[] {
  const issues: string[] = [];
  const board = buildScoreboard(match);
  const totalKills = board.reduce((a, l) => a + l.kills, 0);
  const totalDeaths = board.reduce((a, l) => a + l.deaths, 0);
  if (totalKills !== totalDeaths) {
    issues.push(`kill/death mismatch: ${totalKills} kills vs ${totalDeaths} deaths`);
  }
  const rounds = match.rounds.length;
  if (match.phase === 'match-end' && rounds === 0) issues.push('match ended without rounds');
  if (rounds > 0 && match.phase === 'match-end') {
    const target = match.overtime === 0 ? 13 : 13 + match.overtime * 3;
    const top = Math.max(match.teams.A.score, match.teams.B.score);
    if (top < target) issues.push(`match ended early: ${top} < ${target}`);
  }
  if (rounds > 90) issues.push(`impossible round count: ${rounds}`);
  match.rounds.forEach((r) => {
    if (r.winner === null) issues.push(`round ${r.roundNumber} has no winner`);
    if (r.events.filter((e) => e.kind === 'plant').length > 1) {
      issues.push(`round ${r.roundNumber} planted the bomb twice`);
    }
  });
  const deathsByPlayer = board.filter((l) => l.deaths > rounds);
  if (deathsByPlayer.length) issues.push('a player died more times than rounds played');
  return issues;
}
