import type {
  CareerState, ClubState, GameSettings, GameSnapshot, LeaderboardEntry, OwnedCard,
  PackState, Prospect, SquadState, TaskProgress,
} from '@/types';
import { ECONOMY, GAME_VERSION } from '@/data/config';
import { starterTemplateIds, defaultSquadRoles, TEMPLATE_MAP, PLAYER_MAP } from '@/data/cards';
import { AI_TEAMS } from '@/data/aiTeams';
import { makeId } from '@/engine/rng';

export const DEFAULT_SETTINGS: GameSettings = {
  autoSave: true,
  packSkipAnimation: false,
  compactCards: false,
  matchSpeed: 2,
  showDevPanel: false,
  soundEnabled: false,
};

export function makeCard(templateId: string, level = 1): OwnedCard {
  return { instanceId: makeId('card'), templateId, level, xp: 0, mastery: 0, acquiredAt: Date.now() };
}

export function startingSquad(cards: OwnedCard[]): SquadState {
  const roles = defaultSquadRoles();
  const slots: SquadState['slots'] = { AWPer: null, Entry: null, Lurker: null, Support: null, Anchor: null };
  (Object.keys(roles) as (keyof typeof slots)[]).forEach((role) => {
    const card = cards.find((c) => c.templateId === roles[role]);
    slots[role] = card ? card.instanceId : null;
  });
  const iglCard = cards.find((c) => {
    const tpl = TEMPLATE_MAP[c.templateId];
    return tpl ? tpl.playerId === 'spinx' || tpl.playerId === 'jimpphat' : false;
  }) ?? cards[0];
  return { slots, igl: iglCard ? iglCard.instanceId : null, synergy: 42, matchesTogether: 0 };
}

export function defaultLeaders(clubName: string): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = AI_TEAMS.map((team) => ({
    id: team.id,
    name: team.name,
    isPlayer: false,
    rating: team.rating,
    wins: 6 + team.tier * 3,
    losses: 4 + (5 - team.tier),
    tier: team.tier,
  }));
  entries.push({ id: 'player', name: clubName, isPlayer: true, rating: 1000, wins: 0, losses: 0, tier: 0, isPlayerControlled: true });
  return entries.sort((a, b) => b.rating - a.rating);
}

export function defaultTasks(now = Date.now()): TaskProgress[] {
  return ECONOMY.dailyTasks.map((t) => ({
    id: t.id,
    label: t.label,
    target: t.target,
    progress: 0,
    reward: t.reward,
    claimed: false,
    resetAt: now + 24 * 3600 * 1000,
  }));
}

export const EMPTY_CAREER: CareerState = {
  tier: 0, tierPoints: 0, season: 1, week: 1, lastAdvancedWeek: 1, registeredEventIds: [],
  activeTournamentId: null, completedTournaments: 0, titles: 0,
};

export function createNewGame(clubName: string): GameSnapshot {
  const cards = starterTemplateIds().map((id) => makeCard(id, 1));
  const club: ClubState = {
    id: makeId('club'),
    name: clubName.trim() || '王朝电竞',
    level: 1,
    xp: 0,
    coins: ECONOMY.startingCoins,
    season: 1,
    week: 1,
    day: 1,
    wins: 0,
    losses: 0,
    streak: 0,
    createdAt: Date.now(),
  };
  const pack: PackState = { sinceSR: 0, sinceSSR: 0, totalPulls: 0 };
  return {
    version: GAME_VERSION,
    savedAt: Date.now(),
    club,
    cards,
    squad: startingSquad(cards),
    pack,
    training: [],
    matches: [],
    prospects: [],
    leaders: defaultLeaders(club.name),
    career: { ...EMPTY_CAREER },
    tournaments: [],
    settings: { ...DEFAULT_SETTINGS },
    tasks: defaultTasks(),
    market: [],
    marketSeed: 1,
    claimedAchievements: [],
    customTemplates: [],
    customPlayers: [],
    coinsLedger: [{ id: makeId('led'), delta: ECONOMY.startingCoins, reason: '俱乐部创始资金', at: Date.now() }],
  };
}

export function playerName(playerId: string): string {
  return PLAYER_MAP[playerId]?.nickname ?? playerId;
}

export function playerCountry(playerId: string): string {
  return PLAYER_MAP[playerId]?.countryCode ?? 'XX';
}