// Core domain types for CS2 Dynasty. UI and engine both depend on this file.

export type Role = 'AWPer' | 'Entry' | 'Lurker' | 'Support' | 'Anchor' | 'IGL';
export type CombatRole = 'AWPer' | 'Entry' | 'Lurker' | 'Support' | 'Anchor';
export const COMBAT_ROLES: CombatRole[] = ['AWPer', 'Entry', 'Lurker', 'Support', 'Anchor'];
export const ALL_ROLES: Role[] = [...COMBAT_ROLES, 'IGL'];

export const ROLE_LABEL: Record<Role, string> = {
  AWPer: '狙击手',
  Entry: '突破手',
  Lurker: '自由人',
  Support: '辅助',
  Anchor: '主防',
  IGL: '指挥',
};

export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
export const RARITIES: Rarity[] = ['N', 'R', 'SR', 'SSR', 'UR'];

export type MapId = 'Mirage' | 'Inferno' | 'Nuke' | 'Ancient' | 'Anubis' | 'Dust2' | 'Train';
export const MAP_IDS: MapId[] = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Train'];

export type Side = 'T' | 'CT';

export type AttributeKey =
  | 'aim'
  | 'reflex'
  | 'positioning'
  | 'gameSense'
  | 'utility'
  | 'teamwork'
  | 'clutch'
  | 'leadership';

export const ATTRIBUTE_KEYS: AttributeKey[] = [
  'aim', 'reflex', 'positioning', 'gameSense', 'utility', 'teamwork', 'clutch', 'leadership',
];

export const ATTRIBUTE_LABEL: Record<AttributeKey, string> = {
  aim: '枪法',
  reflex: '反应',
  positioning: '站位',
  gameSense: '意识',
  utility: '道具',
  teamwork: '团队',
  clutch: '残局',
  leadership: '指挥',
};

export type Attributes = Record<AttributeKey, number>;
export type RoleProficiency = Record<Role, number>;
export type MapProficiency = Record<MapId, number>;
/** Short aliases used across data files. */
export type RoleProf = RoleProficiency;
export type MapProf = MapProficiency;

export type SkillKind = 'attribute' | 'map' | 'clutch' | 'economy' | 'synergy';

export interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  kind: SkillKind;
  key: string;
  value: number;
}

/** Layer 1: the human being. Identity never changes between season versions. */
export interface PlayerIdentity {
  id: string;
  nickname: string;
  realName: string;
  country: string;
  countryCode: string;
  age: number;
  /** 简短生涯介绍（中文），显示在卡牌详情。 */
  bio?: string;
  /** 已退役选手：值为其最后一个正式赛季年份；卡面显示「生涯终章」。 */
  retired?: number;
}

/** Layer 2: a season-specific card template. */
export interface CardTemplate {
  id: string;
  playerId: string;
  season: string;
  rarity: Rarity;
  primaryRole: Role;
  secondaryRole: Role;
  attributes: Attributes;
  proficiency: RoleProficiency;
  mapProficiency: MapProficiency;
  skill: Skill;
  /** Growth headroom multiplier for level ups (0.8 = slower, 1.2 = faster). */
  growth: number;
}

/** Layer 3: the instance a player actually owns. */
export interface OwnedCard {
  instanceId: string;
  templateId: string;
  level: number;
  xp: number;
  mastery: number;
  acquiredAt: number;
  /** 突破星级：1 为初始，最高 5。三张同名卡合成 +1 星。 */
  stars?: number;
}

/** 读取卡片星级（旧存档没有该字段时按 1 星处理）。 */
export function starsOf(card: { stars?: number } | null | undefined): number {
  const n = card?.stars ?? 1;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export interface SquadState {
  slots: Record<CombatRole, string | null>;
  igl: string | null;
  synergy: number;
  matchesTogether: number;
}

export type BuyType = 'eco' | 'light' | 'force' | 'full' | 'awp';
export type WeaponKind = 'pistol' | 'strongPistol' | 'smg' | 'rifle' | 'awp';

export interface WeaponSpec {
  id: string;
  name: string;
  kind: WeaponKind;
  cost: number;
  side: 'T' | 'CT' | 'both';
  /** Multiplier applied to a duelist's combat score. */
  power: number;
  /** 0-1 chance the wielder wins a raw aim duel at equal stats. */
  precision: number;
  killReward: number;
}

export interface MapSpec {
  id: MapId;
  name: string;
  tagline: string;
  /** Added to the T side's round strength. */
  tBias: number;
  /** Added to the CT side's round strength. */
  ctBias: number;
  /** AWP friendliness multiplier for duels. */
  awpFactor: number;
  /** 0-100 value of mid control for this map. */
  midValue: number;
  /** Round tempo multiplier; high = faster rounds. */
  tempo: number;
  sites: Record<'A' | 'B', { name: string; tDifficulty: number; ctAdvantage: number; note: string }>;
  description: string;
}

export interface TacticSpec {
  id: string;
  name: string;
  side: Side;
  blurb: string;
  /** Seconds into the round when first contact usually happens (lower = faster). */
  contactAt: number;
  /** Multiplier on the attacking side's duel strength while executing. */
  attackPower: number;
  /** Multiplier on the defending side's duel strength. */
  defensePower: number;
  /** Weight of A vs B when picking a target site. */
  siteBias: Record<'A' | 'B', number>;
  /** How much of the team splits off to the secondary site (0-1). */
  split: number;
  /** Utility consumption 0-1. */
  utility: number;
  /** Information gathering 0-1. */
  info: number;
  /** Trade willingness 0-1. */
  trade: number;
  /** How early the bomb gets planted (0 = slow, 1 = fast). */
  plantSpeed: number;
  /** Counter to spread-out defense. */
  vsSpread: number;
  /** Counter to stacked defense. */
  vsStack: number;
}

export interface WeaponState {
  weaponId: string;
  armor: number;
  helmet: boolean;
  utilities: { flash: number; smoke: number; molotov: number; he: number };
}

export interface MatchPlayerStats {
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  roundsPlayed: number;
  openingKills: number;
  openingDeaths: number;
  multiKills: number;
  clutches: number;
  kastRounds: number;
  headshots: number;
}

export interface MatchPlayerInit {
  cardInstanceId: string;
  templateId: string;
  playerId: string;
  nickname: string;
  countryCode: string;
  role: CombatRole;
  isIGL: boolean;
  attributes: Attributes;
  proficiency: RoleProficiency;
  mapProficiency: MapProficiency;
  skill: Skill;
  ovr: number;
}

export interface MatchPlayerState extends MatchPlayerInit {
  hp: number;
  alive: boolean;
  equipment: WeaponState;
  money: number;
  stats: MatchPlayerStats;
  roundKills: number;
  roundDamage: number;
  roundDealtDamageTo: Record<string, number>;
  previousWeaponId: string;
}

export type MatchEventKind =
  | 'round-start'
  | 'buy'
  | 'utility'
  | 'info'
  | 'duel'
  | 'opening'
  | 'multi'
  | 'plant'
  | 'defuse'
  | 'explode'
  | 'timeout'
  | 'elimination'
  | 'save'
  | 'clutch'
  | 'round-end'
  | 'halftime'
  | 'match-end'
  | 'tactic';

export interface MatchEvent {
  id: string;
  round: number;
  /** Seconds remaining on the round clock when this happened (115 -> 0). */
  clock: number;
  kind: MatchEventKind;
  text: string;
  side?: Side;
  actor?: string;
  victim?: string;
  node?: string;
}

export interface RoundOrders {
  side: Side;
  buy: BuyType;
  tactic: string;
  /** 'A' | 'B' | 'auto' — where to execute / how to set up. */
  target: 'A' | 'B' | 'AUTO';
}

export interface TeamRoundOrders {
  t: RoundOrders;
  ct: RoundOrders;
}

export interface RoundRecord {
  roundNumber: number;
  winner: Side | null;
  reason: 'elimination' | 'bomb' | 'defuse' | 'time' | 'unfinished';
  scoreT: number;
  scoreCT: number;
  bombPlanted: boolean;
  events: MatchEvent[];
  economy: { t: number; ct: number };
  mvpCardId: string | null;
  wentToOvertime: boolean;
}

export interface TeamState {
  id: string;
  name: string;
  shortName: string;
  isPlayer: boolean;
  side: Side;
  score: number;
  players: MatchPlayerState[];
  lossBonus: number;
  orders: TeamRoundOrders;
  economyHistory: number[];
  timeoutUsed: boolean;
}

export interface MatchState {
  id: string;
  seed: number;
  rngState: number;
  mapId: MapId;
  format: 'BO1';
  teams: { A: TeamState; B: TeamState };
  roundNumber: number;
  phase: 'ready' | 'live' | 'round-end' | 'halftime' | 'match-end';
  rounds: RoundRecord[];
  events: MatchEvent[];
  winner: 'A' | 'B' | null;
  startedAt: number;
  overtime: number;
  scoreHistory: { t: number; ct: number }[];
}

export interface MatchStatLine {
  cardInstanceId: string;
  playerId: string;
  nickname: string;
  teamId: string;
  side: Side;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  kast: number;
  kd: number;
  rating: number;
  openingKills: number;
  openingDeaths: number;
  multiKills: number;
  clutches: number;
  damage: number;
  rounds: number;
}

export interface MatchSummary {
  id: string;
  playedAt: number;
  mapId: MapId;
  opponentName: string;
  teamName: string;
  scoreFor: number;
  scoreAgainst: number;
  won: boolean;
  roundsPlayed: number;
  seed: number;
  scoreboard: MatchStatLine[];
  mvp: MatchStatLine | null;
  coins: number;
  xp: number;
  keyRounds: { roundNumber: number; text: string; winner: Side | null }[];
  mode: 'quick' | 'tactical' | 'career' | 'tournament';
  tournamentId?: string;
}

export interface ClubState {
  id: string;
  name: string;
  /** 俱乐部徽章（见 data/clubCosmetics.ts）。 */
  badge?: string;
  /** 徽章主色。 */
  color?: string;
  level: number;
  xp: number;
  coins: number;
  season: number;
  week: number;
  /** 赛季内的第几天（1-365，1 月 1 日开始）。 */
  day: number;
  wins: number;
  losses: number;
  streak: number;
  createdAt: number;
}

export interface PackState {
  sinceSR: number;
  sinceSSR: number;
  totalPulls: number;
}

export interface TrainingRecord {
  id: string;
  cardInstanceId: string;
  nickname: string;
  kind: 'drill' | 'scrim' | 'match' | 'mastery';
  xpGained: number;
  coinsSpent: number;
  at: number;
}

export interface Prospect {
  id: string;
  nickname: string;
  country: string;
  countryCode: string;
  age: number;
  ovr: number;
  potential: number;
  primaryRole: CombatRole;
  secondaryRole: Role;
  growthRate: number;
  traits: string[];
  status: 'academy' | 'promoted' | 'released';
  attributes: Attributes;
  proficiency: RoleProficiency;
  mapProficiency: MapProficiency;
  createdAt: number;
  signedCardId?: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  isPlayer: boolean;
  rating: number;
  wins: number;
  losses: number;
  tier: number;
  isPlayerControlled?: boolean;
  /** 连续留在前 30 的周数。 */
  weeks?: number;
}

/** 一座奖杯：赛事名 + 档位 + 夺冠时间。 */
export interface Honor {
  id: string;
  name: string;
  tier: number;
  wonAt: number;
  prize: number;
}

/** 玩家拥有的教练。 */
export interface OwnedCoach {
  instanceId: string;
  coachId: string;
  /** 执教经验（重复获得时提升）。 */
  xp: number;
}

/** 一次教练抽取的结果（用于结果页展示）。 */
export interface CoachPull {
  coachId: string;
  isNew: boolean;
  xpGained: number;
}

export interface CareerState {
  tier: number;
  tierPoints: number;
  season: number;
  week: number;
  lastAdvancedWeek: number;
  /** 已报名、等待开赛的赛事 id（可同时报名多站）。 */
  registeredEventIds: string[];
  /** 旧字段，仅为旧存档兼容保留。 */
  registeredEventId?: string | null;
  /** 数据迁移标记：AI 战绩基线版本。 */
  recordsVersion?: number;
  activeTournamentId: string | null;
  completedTournaments: number;
  titles: number;
  /** 玩家俱乐部的奖杯墙。 */
  honors?: Honor[];
}

export interface TournamentTeamSnapshot {
  id: string;
  name: string;
  rating: number;
  isPlayer: boolean;
}

export interface TournamentMatch {
  id: string;
  round: number;
  slot: number;
  aId: string;
  bId: string;
  winnerId: string | null;
  scoreA: number;
  scoreB: number;
  mapId: MapId;
}

export interface Tournament {
  id: string;
  name: string;
  tier: number;
  status: 'upcoming' | 'active' | 'completed';
  teams: TournamentTeamSnapshot[];
  matches: TournamentMatch[];
  playerTeamId: string;
  /** 参赛队伍数（8 或 16）。 */
  size: number;
  /** 赛制：single 单败 / double 双败 / swiss 瑞士轮三败出局。 */
  format: 'single' | 'double' | 'swiss';
  /** 允许输几场才出局。 */
  lossLimit: number;
  /** 需要赢几场才能夺冠。 */
  winsNeeded: number;
  /** 玩家在本次赛事中的胜负。 */
  playerWins: number;
  playerLosses: number;
  /** 出局后的名次说明。 */
  placement?: string;
  prizePool: number;
  createdAt: number;
  championId: string | null;
  seed: number;
}

export interface GameSettings {
  /** 界面语言：中文（默认）/ 英文。 */
  language: 'zh' | 'en';
  autoSave: boolean;
  packSkipAnimation: boolean;
  compactCards: boolean;
  matchSpeed: 1 | 2 | 4;
  showDevPanel: boolean;
  soundEnabled: boolean;
}

export interface AITeamSpec {
  id: string;
  name: string;
  shortName: string;
  tier: number;
  rating: number;
  lineup: { templateId: string; role: CombatRole; isIGL: boolean }[];
  /** Preferred T-side tactics in priority order. */
  tTactics: string[];
  ctTactics: string[];
  mapPref: MapId[];
  econStyle: 'conservative' | 'balanced' | 'aggressive';
  adaptivity: number;
  blurb: string;
  /** 英文侦查 blurb（可选，缺失时回退中文）。 */
  blurbEn?: string;
}

export interface TaskProgress {
  id: string;
  label: string;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
  resetAt: number;
}

export interface GameSnapshot {
  version: number;
  savedAt: number;
  club: ClubState;
  cards: OwnedCard[];
  squad: SquadState;
  pack: PackState;
  training: TrainingRecord[];
  matches: MatchSummary[];
  prospects: Prospect[];
  leaders: LeaderboardEntry[];
  career: CareerState;
  tournaments: Tournament[];
  settings: GameSettings;
  tasks: TaskProgress[];
  /** 转会市场当前报价。 */
  /** 转会市场的刷新种子（每周刷新）。 */
  /** 已领取的成就 id。 */
  claimedAchievements: string[];
  /** AI 战队的奖杯墙（战队详情页展示）。 */
  teamHonors?: Record<string, Honor[]>;
  /** 玩家拥有的教练。 */
  coaches?: OwnedCoach[];
  /** 现任主教练（OwnedCoach.instanceId）。 */
  headCoachId?: string | null;
  coinsLedger: { id: string; delta: number; reason: string; at: number }[];
  /** Generated (academy) card templates and their identities, persisted with the save. */
  customTemplates: CardTemplate[];
  customPlayers: PlayerIdentity[];
}