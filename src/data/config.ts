import type { AttributeKey, CombatRole, Rarity, Role } from '@/types';

/**
 * Every balance number lives here so the design can be tuned without touching
 * engine code. Values are original game balance figures, not real-world stats.
 */

export const GAME_VERSION = 4;

export const RARITY_TABLE: Record<Rarity, { rate: number; color: string; glow: string; label: string }> = {
  N: { rate: 0.58, color: '#8B95A5', glow: 'rgba(139,149,165,0.45)', label: '普通' },
  R: { rate: 0.25, color: '#4FA3F7', glow: 'rgba(79,163,247,0.45)', label: '稀有' },
  SR: { rate: 0.12, color: '#B87BF7', glow: 'rgba(184,123,247,0.5)', label: '史诗' },
  SSR: { rate: 0.04, color: '#F5A623', glow: 'rgba(245,166,35,0.55)', label: '传奇' },
  UR: { rate: 0.01, color: '#E5484D', glow: 'rgba(229,72,77,0.6)', label: '巅峰' },
};

export const PACK_CONFIG = {
  singlePrice: 500,
  tenPrice: 4500,
  /** 100 连抽：约 20% 折扣。 */
  hundredPrice: 36000,
  pitySR: 10,
  pitySSR: 60,
  duplicateShards: { N: 20, R: 40, SR: 80, SSR: 160, UR: 320 } as Record<Rarity, number>,
  masteryPerDuplicate: 25,
};

export const ECONOMY = {
  startingCoins: 5000,
  winReward: 420,
  lossReward: 150,
  xpPerWin: 150,
  xpPerLoss: 60,
  trainingCost: 150,
  trainingXp: 220,
  scrimCost: 400,
  scrimXp: 600,
  scoutCost: 800,
  levelUpCoins: 200,
  clubLevelXpBase: 500,
  clubLevelXpStep: 350,
  dailyTasks: [
    { id: 'play_match', label: '完成 1 场比赛', target: 1, reward: 150 },
    { id: 'win_match', label: '赢下 1 场比赛', target: 1, reward: 200 },
    { id: 'open_pack', label: '开启 1 个卡包', target: 1, reward: 100 },
    { id: 'train_card', label: '训练 1 张卡牌', target: 1, reward: 80 },
  ],
};

export const STAR_CONFIG = {
  /** 星级没有上限：只要凑够同名卡就能一直升（属性本身封顶 99）。 */
  maxStars: 999,
  /** 每升一星，全部能力 +3（上限 99）。 */
  bonusPerStar: 3,
  /** 升星所需同名卡数量（含保留的那一张）。 */
  copiesRequired: 3,
};

function buildXpTable(max: number): number[] {
  const table = [0];
  let step = 260;
  for (let i = 1; i < max; i += 1) {
    table.push(table[i - 1] + step);
    step = Math.round(step * 1.18);
  }
  return table;
}

export const LEVEL_CONFIG = {
  /** 等级无实际上限：30 级已经远超一季能练到的程度。 */
  maxLevel: 30,
  xpTable: buildXpTable(30),
  /** Total permanent attribute points granted by level 5, spent along the role growth order. */
  growthPointsPerLevel: 3,
  attributeCap: 99,
  masterCap: 100,
};

/** Which attributes a role improves as it levels. Order matters: points fill top-down. */
export const ROLE_GROWTH: Record<CombatRole, AttributeKey[]> = {
  AWPer: ['aim', 'reflex', 'positioning', 'clutch', 'gameSense'],
  Entry: ['aim', 'reflex', 'teamwork', 'positioning', 'clutch'],
  Lurker: ['gameSense', 'positioning', 'clutch', 'aim', 'reflex'],
  Support: ['utility', 'teamwork', 'gameSense', 'positioning', 'aim'],
  Anchor: ['positioning', 'gameSense', 'reflex', 'utility', 'teamwork'],
};

/**
 * Role-weighted attribute model. Weights sum to 1.0 per role.
 * OVR = 0.75 * weighted attribute score + 0.25 * role proficiency.
 */
export const ROLE_WEIGHTS: Record<Role, Record<AttributeKey, number>> = {
  AWPer: { aim: 0.26, reflex: 0.18, positioning: 0.16, gameSense: 0.14, teamwork: 0.08, utility: 0.06, clutch: 0.1, leadership: 0.02 },
  Entry: { aim: 0.28, reflex: 0.2, positioning: 0.12, gameSense: 0.1, teamwork: 0.14, utility: 0.06, clutch: 0.08, leadership: 0.02 },
  Lurker: { aim: 0.2, reflex: 0.12, positioning: 0.18, gameSense: 0.22, teamwork: 0.06, utility: 0.06, clutch: 0.14, leadership: 0.02 },
  Support: { aim: 0.12, reflex: 0.1, positioning: 0.12, gameSense: 0.16, teamwork: 0.2, utility: 0.24, clutch: 0.04, leadership: 0.02 },
  Anchor: { aim: 0.16, reflex: 0.14, positioning: 0.24, gameSense: 0.18, teamwork: 0.12, utility: 0.1, clutch: 0.05, leadership: 0.01 },
  IGL: { aim: 0.08, reflex: 0.06, positioning: 0.12, gameSense: 0.26, teamwork: 0.19, utility: 0.14, clutch: 0.05, leadership: 0.1 },
};

/**
 * 综合评分的三段式构成：
 *  - attributes：个人能力（枪法/反应/站位/意识/道具…的通用加权，跨位置可比）
 *  - proficiency：该位置熟练度
 *  - team：指挥与团队贡献（领导力、配合、道具组织），专门让 IGL/辅助这类不靠击杀的选手不被低估
 */
export const OVR_BLEND = { attributes: 0.62, proficiency: 0.2, team: 0.18 };

export const TEAM_FACTOR_WEIGHTS: Record<'leadership' | 'teamwork' | 'utility', number> = {
  leadership: 0.45,
  teamwork: 0.35,
  utility: 0.2,
};

/** Base combat model, adjustable per duel context (see engine/combat). */
export const COMBAT_WEIGHTS: Record<AttributeKey, number> = {
  aim: 0.3,
  reflex: 0.16,
  positioning: 0.16,
  gameSense: 0.13,
  teamwork: 0.11,
  utility: 0.09,
  clutch: 0.05,
  leadership: 0,
};

/** P(A wins) = 1 / (1 + exp(-(A - B) / logisticScale)) */
export const COMBAT_SCALE = 32;

/**
 * Round-level form noise: each team gets one signed modifier per round, applied
 * to every duel they take. This is what keeps a stronger team from being a
 * mathematical certainty while never inverting the expected skill ordering.
 */
export const FORM_VARIANCE = 4.2;

export const SYNERGY = {
  base: 42,
  max: 100,
  perMatchGain: 2.2,
  perTrainingGain: 1.1,
  /** Team-wide bonus coefficient: power * (1 + synergy/100 * maxBonus). */
  maxBonus: 0.08,
  sameCountry: 6,
  differentTeamHistoryPenalty: -2,
  maxPairBonus: 12,
};

export const MATCH_ECONOMY = {
  startMoney: 800,
  maxMoney: 16000,
  roundWinReward: 3250,
  plantBonus: 800,
  defuseBonus: 300,
  lossLadder: [1400, 1900, 2400, 2900, 3400],
  pistolRoundMoney: 800,
  /** Cost of the standard kit. */
  armorCost: 650,
  helmetCost: 350,
  utilityCosts: { flash: 200, smoke: 300, molotov: 400, he: 300 },
  buyThresholds: { full: 4700, force: 2500, light: 1600, awp: 4750 },
};

export const BUY_LABEL: Record<'eco' | 'light' | 'force' | 'full' | 'awp', string> = {
  eco: '存钱局',
  light: '轻买',
  force: '强起',
  full: '全买',
  awp: '狙击局',
};

export const REASON_LABEL: Record<string, string> = {
  elimination: '全员击杀',
  bomb: '炸弹爆炸',
  defuse: '拆包成功',
  time: '时间耗尽',
  unfinished: '未完成',
};

export const MATCH_CONFIG = {
  regulationWins: 13,
  regulationRounds: 24,
  halfRounds: 12,
  overtimeRoundsPerHalf: 3,
  overtimeWins: 4,
  roundTime: 115,
  bombTime: 40,
  defuseTime: 5,
  maxRounds: 90,
};

export const CAREER_TIERS = [
  { tier: 0, name: '公开预选赛', prize: 2600, ratingFloor: 0, teams: 32, format: 'single', blurb: '开放预选赛：32 队单败，输一场就回家。' },
  { tier: 1, name: '城市联赛', prize: 4200, ratingFloor: 700, teams: 32, format: 'single', blurb: '城市级联赛：32 队单败，业余强队开始出现。' },
  { tier: 2, name: '区域联赛', prize: 6500, ratingFloor: 900, teams: 16, format: 'single', blurb: '区域封闭预选：16 队单败，赢一场就能拿到积分。' },
  { tier: 3, name: '国家杯', prize: 9000, ratingFloor: 1050, teams: 16, format: 'single', blurb: '国家杯：16 队单败，职业与半职业的分界线。' },
  { tier: 4, name: '挑战者联赛', prize: 12000, ratingFloor: 1150, teams: 16, format: 'double', blurb: '双败小组：输两场才出局，败者组还能杀回来。' },
  { tier: 5, name: '精英联赛', prize: 16000, ratingFloor: 1250, teams: 16, format: 'double', blurb: '精英联赛：双败淘汰，强队开始认真对待。' },
  { tier: 6, name: '国际邀请赛', prize: 22000, ratingFloor: 1350, teams: 16, format: 'double', blurb: '跨赛区的火力对话，双败淘汰制。' },
  { tier: 7, name: '大师赛', prize: 30000, ratingFloor: 1450, teams: 16, format: 'double', blurb: '顶级强队的正面对决，双败淘汰。' },
  { tier: 8, name: '全球总决赛', prize: 42000, ratingFloor: 1550, teams: 32, format: 'swiss', blurb: '赛季收官战：32 队瑞士轮，输满三场淘汰。' },
  { tier: 9, name: 'MAJOR', prize: 60000, ratingFloor: 1650, teams: 64, format: 'swiss', blurb: 'CS 最高殿堂 MAJOR：64 队瑞士轮，7 胜夺冠。' },
];

export const TACTIC_UNLOCK_BY_TIER = 5;

export const TRAINING_DRILLS = [
  { id: 'aim', label: '枪法特训', cost: 120, xp: 160, focus: 'aim' },
  { id: 'utility', label: '道具演练', cost: 120, xp: 160, focus: 'utility' },
  { id: 'scrim', label: '团队训练赛', cost: 400, xp: 520, focus: 'teamwork' },
  { id: 'clutch', label: '残局特训', cost: 220, xp: 260, focus: 'clutch' },
] as const;

export const PROSPECT_CONFIG = {
  minOvr: 58,
  maxOvr: 74,
  minPotential: 82,
  maxPotential: 97,
  scoutCost: 800,
  maxProspects: 8,
};

export const RATING_CONFIG = {
  start: 1000,
  kFactor: 28,
  winFloor: 950,
};

export const UI_CONFIG = {
  navOrder: [
    'dashboard', 'collection', 'squad', 'packs', 'training',
    'match', 'career', 'tournament', 'rankings', 'records', 'settings',
  ],
};