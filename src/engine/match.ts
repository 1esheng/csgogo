import type {
  MatchEvent, MatchPlayerInit, MatchPlayerState, MatchState, MapId, RoundOrders,
  RoundRecord, Side, TeamRoundOrders, TeamState,
} from '@/types';
import { MATCH_CONFIG, MATCH_ECONOMY } from '@/data/config';
import { MAPS } from '@/data/maps';
import { defaultPistol } from '@/data/weapons';
import { Rng, type Rng as RngType } from '@/engine/rng';
import { simulateRound } from '@/engine/round';
import { settleRoundEconomy } from '@/engine/economy';
import { teamBySide } from '@/engine/state';

export interface LineupInput {
  id: string;
  name: string;
  shortName?: string;
  isPlayer?: boolean;
  players: MatchPlayerInit[];
}

export interface CreateMatchOptions {
  seed: number;
  mapId: MapId;
  teamA: LineupInput;
  teamB: LineupInput;
  /** Which team starts on the T side. */
  teamAStartsT?: boolean;
  /** 开场额外现金（教练的纪律/临场加成）。 */
  startMoneyBonus?: { A: number; B: number };
}

function createPlayerState(init: MatchPlayerInit, side: Side, index: number, moneyBonus = 0): MatchPlayerState {
  const pistol = defaultPistol(side);
  return {
    ...init,
    hp: 100,
    alive: true,
    money: MATCH_ECONOMY.startMoney + moneyBonus,
    equipment: {
      weaponId: pistol.id,
      armor: 0,
      helmet: false,
      utilities: { flash: 0, smoke: 0, molotov: 0, he: 0 },
    },
    previousWeaponId: pistol.id,
    roundKills: 0,
    roundDamage: 0,
    roundDealtDamageTo: {},
    stats: {
      kills: 0, deaths: 0, assists: 0, damage: 0, roundsPlayed: 0,
      openingKills: 0, openingDeaths: 0, multiKills: 0, clutches: 0,
      kastRounds: 0, headshots: 0,
    },
    // stagger money slightly so buys are not perfectly identical
    cardInstanceId: init.cardInstanceId || `p${index}`,
  };
}

function defaultOrders(side: Side): RoundOrders {
  return {
    side,
    buy: 'eco',
    tactic: side === 'T' ? 'default' : 'standard_defense',
    target: 'AUTO',
  };
}

function createTeam(input: LineupInput, side: Side, moneyBonus = 0): TeamState {
  return {
    id: input.id,
    name: input.name,
    shortName: input.shortName ?? input.name.slice(0, 3).toUpperCase(),
    isPlayer: input.isPlayer ?? false,
    side,
    score: 0,
    players: input.players.map((p, i) => createPlayerState(p, side, i, moneyBonus)),
    lossBonus: 0,
    orders: {
      t: defaultOrders('T'),
      ct: defaultOrders('CT'),
    },
    economyHistory: [],
    timeoutUsed: false,
  };
}

export function createMatch(options: CreateMatchOptions): MatchState {
  const { seed, mapId, teamA, teamB } = options;
  const startBonus = options.startMoneyBonus;
  const aSide: Side = options.teamAStartsT === false ? 'CT' : 'T';
  const bSide: Side = aSide === 'T' ? 'CT' : 'T';
  const state: MatchState = {
    id: `match-${seed.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    seed,
    rngState: seed,
    mapId,
    format: 'BO1',
    teams: { A: createTeam(teamA, aSide, startBonus?.A ?? 0), B: createTeam(teamB, bSide, startBonus?.B ?? 0) },
    roundNumber: 1,
    phase: 'ready',
    rounds: [],
    events: [],
    winner: null,
    startedAt: Date.now(),
    overtime: 0,
    scoreHistory: [{ t: 0, ct: 0 }],
  };
  return state;
}

/**
 * Rounds needed to win. Regulation is first to 13; each overtime block is MR3
 * (3 rounds per half) and requires 4 wins from the start of that block, so the
 * target advances by 3 per overtime (16, 19, 22 ...).
 */
export function targetScore(match: MatchState): number {
  if (match.overtime === 0) return MATCH_CONFIG.regulationWins;
  return MATCH_CONFIG.regulationWins + 3 * match.overtime;
}

function pushEvent(match: MatchState, kind: MatchEvent['kind'], text: string): void {
  match.events.push({
    id: `${match.id}-sys-${match.events.length}`,
    round: match.roundNumber,
    clock: 0,
    kind,
    text,
  });
}

function swapSides(match: MatchState): void {
  ['A', 'B'].forEach((key) => {
    const team = match.teams[key as 'A' | 'B'];
    team.side = team.side === 'T' ? 'CT' : 'T';
  });
}

/** Plays one full round, then advances score, economy, sides and match phase. */
export function playRound(match: MatchState, orders: TeamRoundOrders): RoundRecord {
  const rng: RngType = new Rng(match.rngState);
  const record = simulateRound(match, rng, orders);
  match.rngState = rng.cursor;

  const winnerSide = record.winner ?? 'CT';
  const winnerTeam = teamBySide(match, winnerSide);
  const loserTeam = teamBySide(match, winnerSide === 'T' ? 'CT' : 'T');
  winnerTeam.score += 1;
  settleRoundEconomy(winnerTeam, loserTeam, record.bombPlanted, 'T');
  winnerTeam.economyHistory.push(winnerTeam.players.reduce((a, p) => a + p.money, 0));
  loserTeam.economyHistory.push(loserTeam.players.reduce((a, p) => a + p.money, 0));

  match.rounds.push(record);
  match.events.push(...record.events);
  match.scoreHistory.push({
    t: teamBySide(match, 'T').score,
    ct: teamBySide(match, 'CT').score,
  });
  match.phase = 'live';

  advanceMatch(match, record.roundNumber);
  return record;
}

function advanceMatch(match: MatchState, completedRound: number): void {
  match.roundNumber = completedRound + 1;
  const a = match.teams.A.score;
  const b = match.teams.B.score;
  const target = targetScore(match);

  if (a >= target || b >= target) {
    match.winner = a > b ? 'A' : 'B';
    match.phase = 'match-end';
    pushEvent(match, 'match-end', `${match.teams[match.winner].name} 以 ${Math.max(a, b)}:${Math.min(a, b)} 拿下比赛${match.overtime ? `（加时 ${match.overtime} 结束）` : ''}。`);
    return;
  }

  if (completedRound > MATCH_CONFIG.maxRounds) {
    match.winner = a >= b ? 'A' : 'B';
    match.phase = 'match-end';
    pushEvent(match, 'match-end', '触发安全上限——按已完成的回合结束比赛。');
    return;
  }

  if (match.overtime === 0) {
    if (completedRound === MATCH_CONFIG.halfRounds) {
      swapSides(match);
      pushEvent(match, 'halftime', `半场结束，${a}:${b}——双方换边。`);
    } else if (completedRound === MATCH_CONFIG.regulationRounds) {
      match.overtime = 1;
      swapSides(match);
      pushEvent(match, 'halftime', `${a}:${b}——进入加时 1。率先拿到 4 个加时回合者获胜。`);
    }
  } else {
    const blockStart = MATCH_CONFIG.regulationRounds + (match.overtime - 1) * MATCH_CONFIG.overtimeRoundsPerHalf * 2;
    const roundsInBlock = completedRound - blockStart;
    if (roundsInBlock === MATCH_CONFIG.overtimeRoundsPerHalf) {
      swapSides(match);
      pushEvent(match, 'halftime', `加时 ${match.overtime} 换边，比分 ${a}:${b}。`);
    } else if (roundsInBlock === MATCH_CONFIG.overtimeRoundsPerHalf * 2) {
      match.overtime += 1;
      swapSides(match);
      pushEvent(match, 'halftime', `${a}:${b}——依然打平，进入加时 ${match.overtime}。`);
    }
  }
  match.phase = 'live';
}

export function isMatchOver(match: MatchState): boolean {
  return match.phase === 'match-end' || match.winner !== null;
}

export function scoreLine(match: MatchState): string {
  return `${match.teams.A.score}:${match.teams.B.score}`;
}

export function regulationLeft(match: MatchState): number {
  return Math.max(0, MATCH_CONFIG.regulationRounds - match.rounds.length);
}

export function mapSpecOf(match: MatchState) {
  return MAPS[match.mapId];
}
