import type { AITeamSpec, LeaderboardEntry, MapId, MatchState, Tournament, TournamentMatch, TournamentTeamSnapshot } from '@/types';
import { CAREER_TIERS, RATING_CONFIG } from '@/data/config';
import { AI_TEAMS, AI_TEAM_MAP, teamsForTier, pickAiMap } from '@/data/aiTeams';
import { lineupFromSpec } from '@/engine/lineup';
import { brainFromSpec } from '@/engine/ai';
import { runFullMatch } from '@/engine/simulate';
import { Rng } from '@/engine/rng';

export function eloDelta(playerRating: number, opponentRating: number, won: boolean, kFactor = RATING_CONFIG.kFactor): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actual = won ? 1 : 0;
  return Math.round(kFactor * (actual - expected));
}

export function tierSpec(tier: number) {
  return CAREER_TIERS[Math.max(0, Math.min(CAREER_TIERS.length - 1, tier))];
}

export function canEnterTier(leagueRating: number, tier: number): boolean {
  return leagueRating >= tierSpec(tier).ratingFloor;
}

function snapshotOf(spec: AITeamSpec): TournamentTeamSnapshot {
  return { id: spec.id, name: spec.name, rating: spec.rating, isPlayer: false };
}

const SEED_8 = [0, 7, 3, 4, 1, 6, 2, 5];
const SEED_16 = [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];

/** 标准淘汰赛种子：1v32、2v31……任意 2 的幂规模都能生成。 */
function seedOrder(size: number): number[] {
  if (size <= 8) return SEED_8;
  if (size <= 16) return SEED_16;
  let order = [0, 1];
  while (order.length < size) {
    const next: number[] = [];
    const n = order.length * 2;
    order.forEach((seed) => {
      next.push(seed);
      next.push(n - 1 - seed);
    });
    order = next;
  }
  return order;
}

/** 赛事的轮数：8 队 3 轮，16 队 4 轮。 */
export function tournamentRounds(t: Tournament): number {
  return Math.max(1, Math.round(Math.log2(t.size || t.teams.length || 8)));
}

export interface CreateTournamentInput {
  tier: number;
  playerTeamName: string;
  playerRating: number;
  seed: number;
}

export function createTournament(input: CreateTournamentInput): Tournament {
  const spec = tierSpec(input.tier);
  const available = teamsForTier(input.tier).length + 1;
  // 只允许 2 的幂规模：队伍池不够时降级到最近的一档（64 → 32 → 16 → 8）
  const wanted = Math.min(spec.teams ?? 8, available);
  let size = 8;
  while (size * 2 <= wanted) size *= 2;
  const pool = teamsForTier(input.tier);
  const rng = new Rng(input.seed);
  const shuffled = rng.shuffle(pool).slice(0, size - 1);
  const player: TournamentTeamSnapshot = {
    id: 'player', name: input.playerTeamName, rating: input.playerRating, isPlayer: true,
  };
  const participants = [player, ...shuffled.map(snapshotOf)];
  if (participants.length < size) {
    throw new Error('Not enough AI teams to fill a ' + size + '-team bracket (got ' + participants.length + ').');
  }
  const format = (spec.format ?? 'single') as Tournament['format'];
  const lossLimit = format === 'single' ? 1 : format === 'double' ? 2 : 3;
  const winsNeeded = format === 'single'
    ? Math.round(Math.log2(size))
    : format === 'double'
      ? Math.max(5, Math.round(Math.log2(size)) + 1)
      : Math.max(6, Math.round(Math.log2(size)) + 1);
  const order = seedOrder(size);
  const bracketSlot = order.map((idx) => participants[idx]);
  const matches: TournamentMatch[] = [];
  if (format !== 'single') {
    // 多败赛制：不预设完整对阵树，按顺序一个一个给你安排对手
    const others = bracketSlot.filter((x) => x.id !== 'player');
    others.slice(0, winsNeeded + lossLimit - 1).forEach((team, i) => {
      matches.push({
        id: 'tm-1-' + i,
        round: 1,
        slot: i,
        aId: 'player',
        bId: team.id,
        winnerId: null,
        scoreA: 0,
        scoreB: 0,
        mapId: pickAiMap(AI_TEAM_MAP[team.id] ?? AI_TEAMS[0], input.seed + i),
      });
    });
    return {
      id: 'tour-' + input.seed.toString(36),
      name: spec.name + ' — Season ' + input.seed.toString(36).slice(-3).toUpperCase(),
      tier: input.tier,
      status: 'active',
      teams: participants,
      matches,
      playerTeamId: 'player',
      size,
      format,
      lossLimit,
      winsNeeded,
      playerWins: 0,
      playerLosses: 0,
      prizePool: spec.prize,
      createdAt: Date.now(),
      championId: null,
      seed: input.seed,
    };
  }
  for (let i = 0; i < size / 2; i += 1) {
    matches.push({
      id: 'tm-1-' + i,
      round: 1,
      slot: i,
      aId: bracketSlot[i * 2].id,
      bId: bracketSlot[i * 2 + 1].id,
      winnerId: null,
      scoreA: 0,
      scoreB: 0,
      mapId: pickAiMap(AI_TEAM_MAP[bracketSlot[i * 2].id] ?? AI_TEAMS[0], input.seed + i),
    });
  }
  return {
    id: 'tour-' + input.seed.toString(36),
    name: spec.name + ' — Season ' + input.seed.toString(36).slice(-3).toUpperCase(),
    tier: input.tier,
    status: 'active',
    teams: participants,
    matches,
    playerTeamId: 'player',
    size,
    format,
    lossLimit,
    winsNeeded,
    playerWins: 0,
    playerLosses: 0,
    prizePool: spec.prize,
    createdAt: Date.now(),
    championId: null,
    seed: input.seed,
  };
}

export function playerNextMatch(t: Tournament): TournamentMatch | null {
  // 已经出局（单败输过 / 多败输满）就没有下一场了，避免出现"你被淘汰但要你打完"的矛盾提示
  if (isEliminated(t)) return null;
  const open = t.matches.filter((m) => m.winnerId === null && (m.aId === t.playerTeamId || m.bId === t.playerTeamId));
  return open.length ? open[0] : null;
}

export function opponentOf(t: Tournament, m: TournamentMatch): TournamentTeamSnapshot | null {
  const id = m.aId === t.playerTeamId ? m.bId : m.aId;
  return t.teams.find((x) => x.id === id) ?? null;
}

export function isEliminated(t: Tournament): boolean {
  // 双败/瑞士轮：输够上限才算出局
  if (t.format && t.format !== 'single') {
    return (t.playerLosses ?? 0) >= (t.lossLimit ?? 1);
  }
  const played = t.matches.filter((m) => m.winnerId && (m.aId === t.playerTeamId || m.bId === t.playerTeamId));
  return played.some((m) => m.winnerId !== t.playerTeamId);
}

export function simulateAiMatch(t: Tournament, m: TournamentMatch, seed: number): { winnerId: string; scoreA: number; scoreB: number; mapId: MapId } {
  const specA = AI_TEAM_MAP[m.aId];
  const specB = AI_TEAM_MAP[m.bId];
  if (!specA || !specB) {
    return { winnerId: m.aId, scoreA: 13, scoreB: 0, mapId: m.mapId };
  }
  const mapId = pickAiMap(specA, seed);
  const state: MatchState = runFullMatch({
    seed,
    mapId,
    teamA: { id: specA.id, name: specA.name, shortName: specA.shortName, players: lineupFromSpec(specA) },
    teamB: { id: specB.id, name: specB.name, shortName: specB.shortName, players: lineupFromSpec(specB) },
    brainA: brainFromSpec(specA),
    brainB: brainFromSpec(specB),
  });
  const winnerId = state.winner === 'A' ? specA.id : specB.id;
  return { winnerId, scoreA: state.teams.A.score, scoreB: state.teams.B.score, mapId };
}

/** Settles every AI-vs-AI match of the current round, then opens the next round. */
export function settleAiMatches(t: Tournament, seedBase: number): Tournament {
  const next = { ...t, matches: t.matches.map((m) => ({ ...m })) };
  let guard = 0;
  let progressed = true;
  while (progressed && guard < 8) {
    guard += 1;
    progressed = false;
    next.matches.forEach((m, index) => {
      if (m.winnerId) return;
      if (m.aId === t.playerTeamId || m.bId === t.playerTeamId) return;
      const result = simulateAiMatch(next, m, seedBase + index * 17 + m.round * 101);
      m.winnerId = result.winnerId;
      m.scoreA = result.scoreA;
      m.scoreB = result.scoreB;
      m.mapId = result.mapId;
      progressed = true;
    });
    progressed = openNextRound(next) || progressed;
  }
  finaliseTournament(next);
  return next;
}

export function openNextRound(t: Tournament): boolean {
  const total = tournamentRounds(t);
  const rounds = Array.from({ length: total }, (_x, i) => i + 1);
  let opened = false;
  for (const round of rounds) {
    if (round === total) break;
    const current = t.matches.filter((m) => m.round === round);
    if (!current.length || current.some((m) => !m.winnerId)) continue;
    const nextRound = round + 1;
    if (t.matches.some((m) => m.round === nextRound)) continue;
    const winners = current.map((m) => m.winnerId as string);
    for (let i = 0; i < winners.length; i += 2) {
      t.matches.push({
        id: 'tm-' + nextRound + '-' + (i / 2),
        round: nextRound,
        slot: i / 2,
        aId: winners[i],
        bId: winners[i + 1],
        winnerId: null,
        scoreA: 0,
        scoreB: 0,
        mapId: 'Mirage',
      });
    }
    opened = true;
  }
  return opened;
}

export function reportPlayerMatch(t: Tournament, matchId: string, playerWon: boolean, scoreFor: number, scoreAgainst: number): Tournament {
  const next = { ...t, matches: t.matches.map((m) => ({ ...m })) };
  const match = next.matches.find((m) => m.id === matchId);
  if (!match) return next;
  const playerIsA = match.aId === t.playerTeamId;
  match.winnerId = playerWon ? t.playerTeamId : (playerIsA ? match.bId : match.aId);
  match.scoreA = playerIsA ? scoreFor : scoreAgainst;
  match.scoreB = playerIsA ? scoreAgainst : scoreFor;

  if (next.format && next.format !== 'single') {
    next.playerWins = (next.playerWins ?? 0) + (playerWon ? 1 : 0);
    next.playerLosses = (next.playerLosses ?? 0) + (playerWon ? 0 : 1);
    const lost = next.playerLosses >= next.lossLimit;
    const won = next.playerWins >= next.winsNeeded;
    if (won) {
      next.status = 'completed';
      next.championId = 'player';
      next.placement = '冠军';
    } else if (lost) {
      next.status = 'completed';
      const remaining = next.teams.filter((x) => !x.isPlayer).sort((a, b) => b.rating - a.rating);
      next.championId = remaining[0]?.id ?? null;
      next.placement = next.playerWins >= next.winsNeeded - 1 ? '亚军' : next.playerWins >= 2 ? '四强' : '十六强';
    }
    return next;
  }

  openNextRound(next);
  finaliseTournament(next);
  return next;
}

/** 多败赛制的状态说明（给界面用）。 */
export function tournamentOutlook(t: Tournament): {
  lives: number; wins: number; losses: number; winsNeeded: number; text: string;
} {
  const lives = Math.max(0, (t.lossLimit ?? 1) - (t.playerLosses ?? 0));
  const wins = t.playerWins ?? 0;
  const losses = t.playerLosses ?? 0;
  const winsNeeded = t.winsNeeded ?? 3;
  const label = t.format === 'double' ? '双败淘汰' : t.format === 'swiss' ? '瑞士轮（三败出局）' : '单败淘汰';
  const text = t.status === 'completed'
    ? (t.championId === 'player' ? '你赢下了这届赛事。' : '本届已结束，你的名次：' + (t.placement ?? '—') + '。')
    : label + '：还需 ' + Math.max(0, winsNeeded - wins) + ' 胜，或再输 ' + lives + ' 场出局。';
  return { lives, wins, losses, winsNeeded, text };
}

export function finaliseTournament(t: Tournament): void {
  if (t.format && t.format !== 'single') {
    if ((t.playerLosses ?? 0) >= (t.lossLimit ?? 1)) {
      t.status = 'completed';
      const remaining = t.teams.filter((x) => !x.isPlayer).sort((a, b) => b.rating - a.rating);
      t.championId = t.championId ?? remaining[0]?.id ?? null;
      t.placement = t.placement ?? ((t.playerWins ?? 0) >= 2 ? '四强' : '十六强');
    }
    return;
  }
  const final = t.matches.find((m) => m.round === tournamentRounds(t));
  if (final && final.winnerId) {
    t.status = 'completed';
    t.championId = final.winnerId;
  }
}

export function tournamentRoundName(round: number, size = 8): string {
  const total = Math.max(1, Math.round(Math.log2(size)));
  const remaining = Math.pow(2, total - round + 1);
  if (remaining >= 64) return '六十四强';
  if (remaining === 32) return '三十二强';
  if (remaining === 16) return '十六强';
  if (remaining === 8) return '四分之一决赛';
  if (remaining === 4) return '半决赛';
  return '总决赛';
}

export function updateLeaderboard(leaders: LeaderboardEntry[], id: string, won: boolean, delta: number): LeaderboardEntry[] {
  return leaders
    .map((entry) => {
      if (entry.id !== id) return entry;
      return {
        ...entry,
        rating: Math.max(RATING_CONFIG.winFloor, entry.rating + delta),
        wins: entry.wins + (won ? 1 : 0),
        losses: entry.losses + (won ? 0 : 1),
      };
    })
    .sort((a, b) => b.rating - a.rating);
}

export function aiTeamById(id: string): AITeamSpec | undefined {
  return AI_TEAM_MAP[id];
}