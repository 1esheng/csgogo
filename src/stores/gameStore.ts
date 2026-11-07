import { create } from 'zustand';
import { SEASON_DAYS, monthDayLabel, seasonEvents } from '@/game/calendar';
import { pick as pickText, t as i18nT } from '@/i18n';
import { CLUB_PRICES } from "@/data/clubCosmetics";
import { COACHES, COACH_MAP, COACH_PACK, COACH_TIER_META, coachTier } from "@/data/coaches";
import { ACHIEVEMENTS } from '@/data/achievements';
import type {
  AITeamSpec, BuyType, CardTemplate, ClubState, CombatRole, GameSettings, GameSnapshot,
  LeaderboardEntry, MapId, MatchPlayerInit, MatchState, MatchSummary, OwnedCard, PackState,
  CoachPull, OwnedCoach, PlayerIdentity, Prospect, RoundOrders, SquadState, TaskProgress, TeamRoundOrders,
  Tournament, TrainingRecord,
} from '@/types';
import type { Tactic } from '@/data/tactics';
import type { Side } from '@/types';
import { COMBAT_ROLES, MAP_IDS, starsOf } from '@/types';
import { ECONOMY, LEVEL_CONFIG, PACK_CONFIG, PROSPECT_CONFIG, STAR_CONFIG, SYNERGY, TRAINING_DRILLS, GAME_VERSION } from '@/data/config';
import { AI_TEAMS, AI_TEAM_MAP } from '@/data/aiTeams';
import { TEMPLATE_MAP, PLAYER_MAP } from '@/data/cards';
import { tacticById, tacticsForSide } from '@/data/tactics';
import { Rng, makeId, randomSeed } from '@/engine/rng';
import { cardOVR, levelFromXp } from '@/engine/rating';
import { coachEffects } from '@/engine/coach';
import { buildSquadBreakdown, type SquadBreakdown } from '@/engine/squad';
import { buildScoreboard, pickMvp } from '@/engine/statistics';
import { createMatch, isMatchOver, playRound } from '@/engine/match';
import { decideAiOrders, brainFromSpec, type AiBrain } from '@/engine/ai';
import { lineupFromSpec } from '@/engine/lineup';
import { decideBuy } from '@/engine/economy';
import { createNewGame, defaultTasks, grownCoach, makeCard, ownedCoachXp, startingSquad } from '@/game/starter';
import { executePulls, pityStatus, type PullResult } from '@/game/packs';
import { registryOf, playerLineupFromSquad } from '@/game/lineups';
import { generateProspect, prospectToIdentity, prospectToTemplate } from '@/game/prospects';
import { addClubXp, applyTaskProgress, bumpSynergy, claimTask, computeMatchRewards } from '@/game/rewards';
import {
  canEnterTier, createTournament, eloDelta, finaliseTournament, isEliminated, opponentOf, playerNextMatch,
  reportPlayerMatch, settleAiMatches, tierSpec, updateLeaderboard,
} from '@/game/career';
import { loadSave, writeSave, writeReplay } from '@/db/db';
import { migrateCards, parseSaveFile, snapshotToJson } from '@/db/save';

export interface Toast { id: string; text: string; kind: 'info' | 'success' | 'error'; }

export interface ActiveMatchInfo {
  mode: 'quick' | 'tactical' | 'career' | 'tournament';
  opponentId: string;
  opponentName: string;
  tournamentId?: string;
  tournamentMatchId?: string;
  brain: AiBrain;
}

/** 每打完一场，让其他战队也打几场：排行榜实时变化。 */
function tickLeaderboard(leaders: LeaderboardEntry[], rng: Rng): LeaderboardEntry[] {
  const pool = leaders.filter((l) => !l.isPlayer);
  if (pool.length === 0) return leaders;
  const next = new Map(leaders.map((l) => [l.id, { ...l }]));
  const games = 4;
  for (let i = 0; i < games; i += 1) {
    const a = next.get(pool[rng.int(0, pool.length - 1)].id);
    const b = next.get(pool[rng.int(0, pool.length - 1)].id);
    if (!a || !b || a.id === b.id) continue;
    const strong = a.rating >= b.rating ? a : b;
    const weak = strong === a ? b : a;
    const delta = Math.max(3, Math.round(eloDelta(strong.rating, weak.rating, true)));
    strong.rating += delta; strong.wins += 1;
    weak.rating = Math.max(800, weak.rating - delta); weak.losses += 1;
  }
  // 每场结算算作一周：前 30 名累加在榜周数
  const ranked = [...next.values()].sort((a, b) => b.rating - a.rating).slice(0, 30);
  ranked.forEach((l) => { l.weeks = (l.weeks ?? 0) + 1; });
  return [...next.values()];
}
let recoveryDone = false;

/** 把赛事里 AI 之间的胜负记进排行榜（只统计还没计过的那一场）。 */
function applyAiResults(leaders: LeaderboardEntry[], prev: Tournament | null, next: Tournament): LeaderboardEntry[] {
  const map = new Map(leaders.map((l) => [l.id, { ...l }]));
  const counted = new Set((prev?.matches ?? []).filter((m) => m.winnerId).map((m) => m.id));
  next.matches.forEach((m) => {
    if (!m.winnerId || counted.has(m.id)) return;
    const loserId = m.winnerId === m.aId ? m.bId : m.aId;
    const winner = map.get(m.winnerId);
    const loser = map.get(loserId);
    if (winner && !winner.isPlayer) { winner.wins += 1; winner.rating += 8; }
    if (loser && !loser.isPlayer) { loser.losses += 1; loser.rating = Math.max(800, loser.rating - 8); }
  });
  return [...map.values()];
}
/** 一次合成的纯函数：返回新的卡牌/阵容与星级，供单张与一键升星共用。 */
function fuseOnce(
  cards: OwnedCard[],
  squad: SquadState,
  templateId: string,
): { ok: boolean; cards?: OwnedCard[]; squad?: SquadState; stars?: number; error?: string } {
  const copies = cards
    .filter((c) => c.templateId === templateId)
    .sort((a, b) => starsOf(b) - starsOf(a) || b.level - a.level || b.xp - a.xp);
  if (copies.length < STAR_CONFIG.copiesRequired) {
    return { ok: false, error: `升星需要 ${STAR_CONFIG.copiesRequired} 张同名卡，当前只有 ${copies.length} 张。` };
  }
  const keep = copies[0];
  const current = starsOf(keep);
  const consumed = copies.slice(1, STAR_CONFIG.copiesRequired);
  const consumeIds = new Set(consumed.map((c) => c.instanceId));
  const nextCards = cards
    .filter((c) => !consumeIds.has(c.instanceId))
    .map((c) => (c.instanceId === keep.instanceId
      ? { ...c, stars: current + 1, mastery: Math.min(LEVEL_CONFIG.masterCap, c.mastery + 10) }
      : c));
  const slots = { ...squad.slots };
  (Object.keys(slots) as (keyof typeof slots)[]).forEach((role) => {
    const id = slots[role];
    if (id && consumeIds.has(id)) slots[role] = keep.instanceId;
  });
  const igl = squad.igl && consumeIds.has(squad.igl) ? keep.instanceId : squad.igl;
  return { ok: true, cards: nextCards, squad: { ...squad, slots, igl }, stars: current + 1 };
}
const bootstrap = createNewGame('Dynasty Esports');

function recomputeLevel(card: OwnedCard): OwnedCard {
  const level = levelFromXp(card.xp);
  return { ...card, level: Math.min(LEVEL_CONFIG.maxLevel, Math.max(card.level, level)) };
}

export interface GameStore {
  ready: boolean;
  hasGame: boolean;
  club: ClubState;
  cards: OwnedCard[];
  squad: SquadState;
  pack: PackState;
  training: TrainingRecord[];
  matches: MatchSummary[];
  prospects: Prospect[];
  leaders: LeaderboardEntry[];
  career: GameSnapshot['career'];
  tournaments: Tournament[];
  settings: GameSettings;
  tasks: TaskProgress[];
  claimedAchievements: string[];
  teamHonors: Record<string, import("@/types").Honor[]>;
  coaches: OwnedCoach[];
  headCoachId: string | null;
  /** 每张地图的默认战术（旧存档缺省为空对象）。 */
  tacticDefaults: Partial<Record<MapId, string>>;
  /** 教练执教经验：OwnedCoach.instanceId → xp（旧存档缺省为空对象）。 */
  coachXp: Record<string, number>;
  setDefaultTactic: (mapId: MapId, tacticId: string) => void;
  openCoachPack: (count: number) => OwnedCoach[] | null;
  setHeadCoach: (instanceId: string | null) => void;
  coinsLedger: GameSnapshot['coinsLedger'];
  customTemplates: CardTemplate[];
  customPlayers: PlayerIdentity[];

  activeMatch: MatchState | null;
  activeMatchInfo: ActiveMatchInfo | null;
  playerOrders: RoundOrders | null;
  lastSummary: MatchSummary | null;
  lastPackResults: PullResult[] | null;
  lastCoachResults: CoachPull[] | null;
  /** 实时电竞世界：每分钟推进一轮 AI 对局并刷新排行榜。 */
  liveWorld: { enabled: boolean; lastTickAt: number; ticks: number; feed: { id: string; text: string; /** 英文动态（渲染处 pick(text, textEn)）。 */ textEn?: string; at: number }[] };
  tickLiveWorld: () => void;
  setLiveWorld: (enabled: boolean) => void;
  renameClub: (name: string) => { ok: boolean; error?: string };
  setClubLook: (badge: string, color: string) => { ok: boolean; error?: string };
  celebration: { id: string; title: string; subtitle?: string; tone: 'level' | 'star' | 'rare' } | null;
  celebrate: (c: { title: string; subtitle?: string; tone?: 'level' | 'star' | 'rare' }) => void;
  clearCelebration: () => void;
  clearCoachResults: () => void;
  toasts: Toast[];

  init: () => Promise<void>;
  newGame: (name: string) => Promise<void>;
  resetGame: () => Promise<void>;
  exportSave: () => Promise<string>;
  importSave: (json: string) => Promise<{ ok: boolean; error?: string }>;
  saveNow: () => Promise<void>;
  snapshot: () => GameSnapshot;

  templates: () => Record<string, CardTemplate>;
  players: () => Record<string, PlayerIdentity>;
  nameOf: (playerId: string) => string;
  templateForCard: (instanceId: string) => CardTemplate | undefined;
  squadRating: (mapId?: MapId) => SquadBreakdown;
  pity: () => ReturnType<typeof pityStatus>;

  toast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;

  openPack: (count: number) => PullResult[] | null;
  clearPackResults: () => void;

  assignSlot: (role: CombatRole, instanceId: string | null) => { ok: boolean; error?: string };
  setIGL: (instanceId: string | null) => void;
  autoFillSquad: () => void;

  trainCard: (instanceId: string, drillId: string) => { ok: boolean; error?: string };
  fuseCards: (templateId: string) => { ok: boolean; error?: string; stars?: number };
  /** 一键升星：把所有凑够同名卡且未满星的卡牌依次升星。 */
  fuseAll: () => { ok: boolean; starsGained: number; players: number };
  /** 按选手训练：同名卡一起获得经验（只扣一次费用）。 */
  trainPlayer: (templateId: string, drillId: string) => { ok: boolean; error?: string; copies?: number };
  /** 一键训练当前首发五人（同名卡一起升级，按人数扣费）。 */
  trainSquad: (drillId: string) => { ok: boolean; error?: string; trained?: number; spent?: number };
  claimTaskReward: (taskId: string) => void;

  scoutProspect: () => { ok: boolean; error?: string };
  promoteProspect: (id: string) => { ok: boolean; error?: string };
  releaseProspect: (id: string) => void;

  startMatch: (opts: { mapId: MapId; opponentId: string; mode: ActiveMatchInfo['mode']; tactic?: string; tournamentId?: string; tournamentMatchId?: string }) => { ok: boolean; error?: string };
  finalizeFromStore: () => void;
  setPlayerOrders: (patch: Partial<RoundOrders>) => void;
  playNextRound: () => void;
  autoPlay: () => void;
  quitMatch: () => void;

  enterTournament: (tier: number, eventId?: string) => { ok: boolean; error?: string };
  /** 报名赛季赛事（必须在报名截止日前）。 */
  registerEvent: (eventId: string) => { ok: boolean; error?: string };
  /** 推进时间（天）。 */
  advanceDays: (days: number) => void;
  /** 取消报名。 */
  unregisterEvent: (eventId: string) => void;
  /** 开赛：指定已报名的某一站（到比赛日才能打）。 */
  startEvent: (eventId: string) => { ok: boolean; error?: string };
  /** 开赛：打最早一场已经到日期的报名。 */
  startRegisteredEvent: () => { ok: boolean; error?: string };
  startTournamentMatch: () => { ok: boolean; error?: string };
  simulateTournamentRemainder: (tournamentId: string) => void;
  /** 快速模拟：自动替你把当前赛事从头打到结束（含 AI 赛程），结束后给出结果。 */
  simulateCareerSeason: (tournamentId: string) => { ok: boolean; error?: string; matchesPlayed?: number; champion?: string };

  updateSettings: (patch: Partial<GameSettings>) => void;
  /** 调试用：直接加金币（仅开发者面板调用，正式玩法不应使用）。 */
  grantTestCoins: (amount: number) => void;
  /** 刷新转会市场（花费金币）。 */
  /** 买下一名球员。 */
  /** 领取成就奖励。 */
  claimAchievement: (id: string) => { ok: boolean; error?: string };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ready: false,
  hasGame: false,
  club: bootstrap.club,
  cards: bootstrap.cards,
  squad: bootstrap.squad,
  pack: bootstrap.pack,
  training: [],
  matches: [],
  prospects: [],
  leaders: bootstrap.leaders,
  career: bootstrap.career,
  tournaments: [],
  settings: bootstrap.settings,
  tasks: bootstrap.tasks,
  claimedAchievements: [],
  teamHonors: {},
  coaches: [],
  headCoachId: null,
  tacticDefaults: {},
  coachXp: {},
  coinsLedger: bootstrap.coinsLedger,
  customTemplates: [],
  customPlayers: [],
  activeMatch: null,
  activeMatchInfo: null,
  playerOrders: null,
  lastSummary: null,
  lastPackResults: null,
  lastCoachResults: null,
  liveWorld: { enabled: true, lastTickAt: 0, ticks: 0, feed: [] },
  celebration: null,
  toasts: [],

  snapshot: () => {
    const s = get();
    return {
      version: GAME_VERSION,
      savedAt: Date.now(),
      club: s.club,
      cards: s.cards,
      squad: s.squad,
      pack: s.pack,
      training: s.training,
      matches: s.matches,
      prospects: s.prospects,
      leaders: s.leaders,
      career: s.career,
      tournaments: s.tournaments,
      settings: s.settings,
      tasks: s.tasks,
      claimedAchievements: s.claimedAchievements,
      teamHonors: s.teamHonors,
      coaches: s.coaches,
      headCoachId: s.headCoachId,
      tacticDefaults: s.tacticDefaults,
      coachXp: s.coachXp,
      coinsLedger: s.coinsLedger,
      customTemplates: s.customTemplates,
      customPlayers: s.customPlayers,
    };
  },

  init: async () => {
    const loaded = await loadSave();
    const snapshot = loaded ? migrateCards(loaded) : null;
    if (snapshot) {
      set({
        ready: true, hasGame: true,
        club: snapshot.club, cards: snapshot.cards, squad: snapshot.squad, pack: snapshot.pack,
        training: snapshot.training ?? [], matches: snapshot.matches ?? [],
        prospects: snapshot.prospects ?? [], leaders: snapshot.leaders ?? [],
        career: snapshot.career, tournaments: snapshot.tournaments ?? [],
        settings: { ...bootstrap.settings, ...(snapshot.settings ?? {}) },
        tasks: snapshot.tasks?.length ? snapshot.tasks : defaultTasks(),
        coinsLedger: snapshot.coinsLedger ?? [],
        customTemplates: snapshot.customTemplates ?? [],
        customPlayers: snapshot.customPlayers ?? [],
        teamHonors: snapshot.teamHonors ?? {},
        coaches: snapshot.coaches ?? [],
        headCoachId: snapshot.headCoachId ?? null,
        tacticDefaults: snapshot.tacticDefaults ?? {},
        coachXp: snapshot.coachXp ?? {},
      });
      const filledNow = Object.values(snapshot.squad.slots).filter(Boolean).length;
      if (filledNow === 0 && snapshot.cards.length >= 5 && !recoveryDone) {
        recoveryDone = true;
        setTimeout(() => {
          const st = useGameStore.getState();
          if (st.squadRating().filled === 0) st.autoFillSquad();
        }, 0);
      }
    } else {
      set({ ready: true, hasGame: false });
    }
  },

  newGame: async (name: string) => {
    const fresh = createNewGame(name);
    set({
      ready: true, hasGame: true,
      club: fresh.club, cards: fresh.cards, squad: fresh.squad, pack: fresh.pack,
      training: [], matches: [], prospects: [], leaders: fresh.leaders,
      career: fresh.career, tournaments: [], settings: fresh.settings,
      tasks: fresh.tasks, coinsLedger: fresh.coinsLedger,
      customTemplates: [], customPlayers: [],
      tacticDefaults: fresh.tacticDefaults ?? {}, coachXp: fresh.coachXp ?? {},
      activeMatch: null, activeMatchInfo: null, playerOrders: null, lastSummary: null, lastPackResults: null,
    });
    await writeSave(get().snapshot());
    get().toast(`俱乐部已创建——欢迎来到职业巡回赛，${fresh.club.name}。`, 'success');
  },

  resetGame: async () => {
    set({ ready: true, hasGame: false, activeMatch: null, activeMatchInfo: null, lastSummary: null, lastPackResults: null });
    await writeSave(createNewGame('Dynasty Esports'));
    const fresh = createNewGame('Dynasty Esports');
    set({ club: fresh.club, cards: fresh.cards, squad: fresh.squad, leaders: fresh.leaders });
    get().toast('存档已重置，创建新俱乐部即可继续。', 'info');
  },

  exportSave: async () => snapshotToJson(get().snapshot()),

  importSave: async (json: string) => {
    const result = parseSaveFile(json);
    if (!result.ok || !result.snapshot) return { ok: false, error: result.error ?? '存档无效。' };
    const s = result.snapshot;
    set({
      ready: true, hasGame: true,
      club: s.club, cards: s.cards, squad: s.squad, pack: s.pack,
      training: s.training, matches: s.matches, prospects: s.prospects, leaders: s.leaders,
      career: s.career, tournaments: s.tournaments, settings: s.settings,
      tasks: s.tasks.length ? s.tasks : defaultTasks(),
      coinsLedger: s.coinsLedger, customTemplates: s.customTemplates, customPlayers: s.customPlayers,
      activeMatch: null, activeMatchInfo: null, playerOrders: null, lastSummary: null,
    });
    await writeSave(get().snapshot());
    get().toast('存档导入成功。', 'success');
    return { ok: true };
  },

  saveNow: async () => { await writeSave(get().snapshot()); },

  templates: () => registryOf({ customTemplates: get().customTemplates, customPlayers: get().customPlayers }).templates,
  players: () => registryOf({ customTemplates: get().customTemplates, customPlayers: get().customPlayers }).players,
  nameOf: (playerId: string) => {
    const p = get().players()[playerId];
    return p ? p.nickname : playerId;
  },
  templateForCard: (instanceId: string) => {
    const card = get().cards.find((c) => c.instanceId === instanceId);
    if (!card) return undefined;
    return get().templates()[card.templateId];
  },
  squadRating: (mapId?: MapId) => {
    const s = get();
    const { templates, players } = registryOf({ customTemplates: s.customTemplates, customPlayers: s.customPlayers });
    const names: Record<string, string> = {};
    Object.values(players).forEach((p) => { names[p.id] = p.nickname; });
    return buildSquadBreakdown({ squad: s.squad, cards: s.cards, templates, playerNames: names, mapId });
  },
  pity: () => pityStatus(get().pack),

  toast: (text: string, kind: Toast['kind'] = 'info') => {
    const id = makeId('toast');
    set({ toasts: [...get().toasts.slice(-3), { id, text, kind }] });
    setTimeout(() => {
      const current = get().toasts;
      if (current.some((t) => t.id === id)) set({ toasts: current.filter((t) => t.id !== id) });
    }, 4200);
  },
  dismissToast: (id: string) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  openPack: (count: number) => {
    const s = get();
    const price = count >= 100 ? PACK_CONFIG.hundredPrice : count === 10 ? PACK_CONFIG.tenPrice : PACK_CONFIG.singlePrice;
    if (s.club.coins < price) {
      s.toast(`金币不足——需要 ${price}。`, 'error');
      return null;
    }
    const rng = new Rng(randomSeed());
    const { results, pack } = executePulls(rng, s.pack, count, s.cards);
    const newCards: OwnedCard[] = [];
    const updated = [...s.cards];
    let coinsBack = 0;
    results.forEach((r) => {
      // 星级没有上限，所以重复卡永远是合成材料：一张都不折算，全部入库。
      const card = makeCard(r.template.id, 1);
      newCards.push(card);
      updated.push(card);
    });
    const club = { ...s.club, coins: s.club.coins - price + coinsBack };
    set({
      cards: updated,
      pack,
      club,
      lastPackResults: results,
      tasks: applyTaskProgress(s.tasks, 'open_pack', 1),
      coinsLedger: trimmedLedger(s.coinsLedger, [
        { id: makeId('led'), delta: -price, reason: count >= 100 ? '百连抽' : count === 10 ? '十连抽' : '单抽', at: Date.now() },
        ...(coinsBack > 0 ? [{ id: makeId('led'), delta: coinsBack, reason: '重复卡牌兑换', at: Date.now() }] : []),
      ]),
    });
    void writeSave(get().snapshot());
    return results;
  },
  clearPackResults: () => set({ lastPackResults: null }),

  assignSlot: (role, instanceId) => {
    const s = get();
    if (!instanceId) {
      set({ squad: { ...s.squad, slots: { ...s.squad.slots, [role]: null } } });
      void writeSave(get().snapshot());
      return { ok: true };
    }
    // Moving a card that already occupies another slot is a swap, not a duplicate.
    const sourceSlot = COMBAT_ROLES.find((r) => s.squad.slots[r] === instanceId);
    if (sourceSlot && sourceSlot !== role) {
      set({ squad: { ...s.squad, slots: { ...s.squad.slots, [sourceSlot]: null, [role]: instanceId } } });
      void writeSave(get().snapshot());
      return { ok: true };
    }
    const card = s.cards.find((c) => c.instanceId === instanceId);
    if (!card) return { ok: false, error: '这张卡不在你的收藏里。' };
    const tpl = s.templates()[card.templateId];
    if (!tpl) return { ok: false, error: '未知的卡牌模板。' };
    const clash = COMBAT_ROLES.some((r) => {
      if (r === role) return false;
      const other = s.squad.slots[r];
      if (!other) return false;
      const otherCard = s.cards.find((c) => c.instanceId === other);
      const otherTpl = otherCard ? s.templates()[otherCard.templateId] : undefined;
      return otherTpl ? otherTpl.playerId === tpl.playerId : false;
    });
    if (clash) return { ok: false, error: '同一名选手不能同时占两个位置（不同赛季版本也算同一名选手）。' };
    set({ squad: { ...s.squad, slots: { ...s.squad.slots, [role]: instanceId } } });
    void writeSave(get().snapshot());
    return { ok: true };
  },

  setIGL: (instanceId) => { set({ squad: { ...get().squad, igl: instanceId } }); void writeSave(get().snapshot()); },

  autoFillSquad: () => {
    const s = get();
    const templates = s.templates();
    const used = new Set<string>();
    const slots: SquadState['slots'] = { AWPer: null, Entry: null, Lurker: null, Support: null, Anchor: null };
    const scored = COMBAT_ROLES.map((role) => {
      const best = [...s.cards]
        .map((card) => {
          const tpl = templates[card.templateId];
          if (!tpl) return null;
          const prof = tpl.proficiency[role] ?? 0;
          const natural = tpl.primaryRole === role ? 30 : tpl.secondaryRole === role ? 15 : 0;
          return { card, tpl, score: prof + natural + card.level * 2 };
        })
        .filter((x): x is { card: OwnedCard; tpl: CardTemplate; score: number } => x !== null)
        .sort((a, b) => b.score - a.score);
      return { role, best };
    });
    scored.forEach(({ role, best }) => {
      const pick = best.find((b) => !used.has(b.tpl.playerId));
      if (pick) {
        slots[role] = pick.card.instanceId;
        used.add(pick.tpl.playerId);
      }
    });
    // Only a fielded card may be crowned IGL, otherwise leadership would count for nothing.
    const fieldedIds = COMBAT_ROLES.map((r) => slots[r]).filter((v): v is string => Boolean(v));
    const iglCandidate = fieldedIds
      .map((instanceId) => {
        const card = s.cards.find((c) => c.instanceId === instanceId);
        const tpl = card ? templates[card.templateId] : undefined;
        return card && tpl ? { instanceId, igl: tpl.proficiency.IGL ?? 0 } : null;
      })
      .filter((x): x is { instanceId: string; igl: number } => x !== null)
      .sort((a, b) => b.igl - a.igl)[0];
    set({ squad: { ...s.squad, slots, igl: iglCandidate ? iglCandidate.instanceId : null } });
    get().toast('已按最合适的卡牌自动补全阵容。', 'success');
    void writeSave(get().snapshot());
  },

  fuseCards: (templateId: string) => {
    const s = get();
    const fused = fuseOnce(s.cards, s.squad, templateId);
    if (!fused.ok) return { ok: false, error: fused.error };
    set({ cards: fused.cards!, squad: fused.squad! });
    const tpl = s.templates()[templateId];
    const label = tpl ? s.nameOf(tpl.playerId) : '卡牌';
    get().toast(`${label} 升到 ${fused.stars} 星，全能力 +${STAR_CONFIG.bonusPerStar}。`, 'success');
    get().celebrate({ title: label + ' 升到 ' + fused.stars + ' 星', subtitle: '全能力 +' + STAR_CONFIG.bonusPerStar, tone: 'star' });
    void writeSave(get().snapshot());
    return { ok: true, stars: fused.stars };
  },

  fuseAll: () => {
    const start = get();
    const templateIds = Array.from(new Set(start.cards.map((c) => c.templateId)));
    let cards = start.cards;
    let squad = start.squad;
    let starsGained = 0;
    const players = new Set<string>();
    templateIds.forEach((id) => {
      let guard = 0;
      while (guard < STAR_CONFIG.maxStars) {
        guard += 1;
        const fused = fuseOnce(cards, squad, id);
        if (!fused.ok) break;
        cards = fused.cards!;
        squad = fused.squad!;
        starsGained += 1;
        players.add(id);
      }
    });
    if (starsGained === 0) {
      get().toast('没有可以升星的卡牌——先凑够三张同名卡。', 'info');
      return { ok: false, starsGained: 0, players: 0 };
    }
    set({ cards, squad });
    get().toast(`一键升星完成：${players.size} 名选手共升 ${starsGained} 星，每星全能力 +${STAR_CONFIG.bonusPerStar}。`, 'success');
    void writeSave(get().snapshot());
    return { ok: true, starsGained, players: players.size };
  },
  trainSquad: (drillId: string) => {
    const s = get();
    const headOwned = (s.coaches ?? []).find((c) => c.instanceId === s.headCoachId);
    const coachBonus = coachEffects(grownCoach(headOwned ? COACH_MAP[headOwned.coachId] : null, ownedCoachXp(headOwned, s.coachXp)));
    const drill = TRAINING_DRILLS.find((d) => d.id === drillId);
    if (!drill) return { ok: false, error: '未知的训练项目。' };
    const lineup = COMBAT_ROLES.map((role) => s.squad.slots[role]).filter((id): id is string => Boolean(id));
    if (lineup.length === 0) return { ok: false, error: '首发阵容还是空的，先指派选手。' };
    const templates = s.templates();
    const playerIds = Array.from(new Set(lineup
      .map((id) => {
        const card = s.cards.find((c) => c.instanceId === id);
        return card ? card.templateId : null;
      })
      .filter((id): id is string => Boolean(id))));
    if (playerIds.length === 0) return { ok: false, error: '首发阵容里的卡牌不存在。' };

    let coins = s.club.coins;
    let cards = s.cards;
    let trained = 0;
    let spent = 0;
    let lastGain = 0;
    const records: TrainingRecord[] = [];
    playerIds.forEach((templateId) => {
      if (coins < drill.cost) return;
      const tpl = templates[templateId];
      if (!tpl) return;
      const owned = cards.filter((c) => c.templateId === templateId);
      if (!owned.length) return;
      const best = owned.reduce((a, b) => (b.level > a.level || (b.level === a.level && b.xp > a.xp) ? b : a));
      if (best.level >= LEVEL_CONFIG.maxLevel && best.xp >= LEVEL_CONFIG.xpTable[LEVEL_CONFIG.maxLevel - 1]) return;
      const gain = Math.round(drill.xp * tpl.growth * (1 + coachBonus.trainingXpPct));
      lastGain = gain;
      cards = cards.map((c) => (c.templateId === templateId ? recomputeLevel({ ...c, xp: c.xp + gain }) : c));
      coins -= drill.cost;
      spent += drill.cost;
      trained += 1;
      records.push({
        id: makeId('train'),
        cardInstanceId: best.instanceId,
        nickname: s.nameOf(tpl.playerId),
        kind: drillId === 'scrim' ? 'scrim' : 'drill',
        xpGained: gain,
        coinsSpent: drill.cost,
        at: Date.now(),
      });
    });

    if (trained === 0) {
      get().toast('没有可以训练的选手——要么金币不足，要么首发都已满级。', 'error');
      return { ok: false, error: '没有可以训练的选手。' };
    }
    set({
      cards,
      club: { ...s.club, coins },
      training: [...records, ...s.training].slice(0, 60),
      squad: drillId === 'scrim' ? { ...s.squad, synergy: bumpSynergy(s.squad.synergy, SYNERGY.perTrainingGain * trained) } : s.squad,
      tasks: applyTaskProgress(s.tasks, 'train_card', trained),
      coinsLedger: trimmedLedger(s.coinsLedger, [{ id: makeId('led'), delta: -spent, reason: `整队训练：${drill.label}`, at: Date.now() }]),
    });
    get().toast(`整队训练完成：${trained} 名首发各获得 ${lastGain} 经验，共花费 ${spent.toLocaleString()} 金币。`, 'success');
    void writeSave(get().snapshot());
    return { ok: true, trained, spent };
  },
  trainPlayer: (templateId: string, drillId: string) => {
    const s = get();
    const headOwned = (s.coaches ?? []).find((c) => c.instanceId === s.headCoachId);
    const coachBonus = coachEffects(grownCoach(headOwned ? COACH_MAP[headOwned.coachId] : null, ownedCoachXp(headOwned, s.coachXp)));
    const drill = TRAINING_DRILLS.find((d) => d.id === drillId);
    if (!drill) return { ok: false, error: '未知的训练项目。' };
    const owned = s.cards.filter((c) => c.templateId === templateId);
    if (!owned.length) return { ok: false, error: '找不到这张卡牌。' };
    const best = owned.reduce((a, b) => (b.level > a.level || (b.level === a.level && b.xp > a.xp) ? b : a));
    if (best.level >= LEVEL_CONFIG.maxLevel && best.xp >= LEVEL_CONFIG.xpTable[LEVEL_CONFIG.maxLevel - 1]) {
      return { ok: false, error: '这名选手已经满级了。' };
    }
    if (s.club.coins < drill.cost) return { ok: false, error: '金币不足，无法进行这项训练。' };
    const tpl = s.templates()[templateId];
    const gain = Math.round(drill.xp * (tpl ? tpl.growth : 1) * (1 + coachBonus.trainingXpPct));
    const cards = s.cards.map((c) => (c.templateId === templateId ? recomputeLevel({ ...c, xp: c.xp + gain }) : c));
    const name = tpl ? s.nameOf(tpl.playerId) : '该选手';
    const record: TrainingRecord = {
      id: makeId('train'),
      cardInstanceId: best.instanceId,
      nickname: name,
      kind: drillId === 'scrim' ? 'scrim' : 'drill',
      xpGained: gain,
      coinsSpent: drill.cost,
      at: Date.now(),
    };
    set({
      cards,
      club: { ...s.club, coins: s.club.coins - drill.cost },
      training: [record, ...s.training].slice(0, 60),
      squad: drillId === 'scrim' ? { ...s.squad, synergy: bumpSynergy(s.squad.synergy, SYNERGY.perTrainingGain) } : s.squad,
      tasks: applyTaskProgress(s.tasks, 'train_card', 1),
      coinsLedger: trimmedLedger(s.coinsLedger, [{ id: makeId('led'), delta: -drill.cost, reason: `训练：${drill.label}`, at: Date.now() }]),
    });
    get().toast(`${name} 的 ${owned.length} 张同名卡各获得 ${gain} 经验（${drill.label}）。`, 'success');
    void writeSave(get().snapshot());
    return { ok: true, copies: owned.length };
  },
  trainCard: (instanceId, drillId) => {
    const s = get();
    const drill = TRAINING_DRILLS.find((d) => d.id === drillId);
    if (!drill) return { ok: false, error: '未知的训练项目。' };
    const card = s.cards.find((c) => c.instanceId === instanceId);
    if (!card) return { ok: false, error: '找不到这张卡牌。' };
    if (card.level >= LEVEL_CONFIG.maxLevel && card.xp >= LEVEL_CONFIG.xpTable[LEVEL_CONFIG.maxLevel - 1]) {
      return { ok: false, error: '这张卡已经满级了。' };
    }
    if (s.club.coins < drill.cost) return { ok: false, error: '金币不足，无法进行这项训练。' };
    const tpl = s.templates()[card.templateId];
    const headO = (s.coaches ?? []).find((c) => c.instanceId === s.headCoachId);
    const coachBonus = coachEffects(grownCoach(headO ? COACH_MAP[headO.coachId] : null, ownedCoachXp(headO, s.coachXp)));
    const gain = Math.round(drill.xp * (tpl ? tpl.growth : 1) * (1 + coachBonus.trainingXpPct));
    const updated = s.cards.map((c) => (c.instanceId === instanceId ? recomputeLevel({ ...c, xp: c.xp + gain }) : c));
    const record: TrainingRecord = {
      id: makeId('train'),
      cardInstanceId: instanceId,
      nickname: get().nameOf(tpl ? tpl.playerId : card.templateId),
      kind: drillId === 'scrim' ? 'scrim' : drillId === 'clutch' ? 'drill' : 'drill',
      xpGained: gain,
      coinsSpent: drill.cost,
      at: Date.now(),
    };
    set({
      cards: updated,
      club: { ...s.club, coins: s.club.coins - drill.cost },
      training: [record, ...s.training].slice(0, 60),
      squad: drillId === 'scrim' ? { ...s.squad, synergy: bumpSynergy(s.squad.synergy, SYNERGY.perTrainingGain) } : s.squad,
      tasks: applyTaskProgress(s.tasks, 'train_card', 1),
      coinsLedger: trimmedLedger(s.coinsLedger, [{ id: makeId('led'), delta: -drill.cost, reason: `训练：${drill.label}`, at: Date.now() }]),
    });
    get().toast(`${record.nickname} 获得 ${gain} 经验（${drill.label}）。`, 'success');
    void writeSave(get().snapshot());
    return { ok: true };
  },

  claimTaskReward: (taskId) => {
    const s = get();
    const { tasks, reward } = claimTask(s.tasks, taskId);
    if (reward <= 0) { get().toast('任务还没有完成。', 'error'); return; }
    set({
      tasks,
      club: { ...s.club, coins: s.club.coins + reward },
      coinsLedger: trimmedLedger(s.coinsLedger, [{ id: makeId('led'), delta: reward, reason: '每日任务奖励', at: Date.now() }]),
    });
    get().toast(`已领取 ${reward} 金币。`, 'success');
    void writeSave(get().snapshot());
  },

  scoutProspect: () => {
    const s = get();
    if (s.prospects.filter((p) => p.status === 'academy').length >= PROSPECT_CONFIG.maxProspects) {
      return { ok: false, error: '青训营已满——请先提拔或解约一名新秀。' };
    }
    if (s.club.coins < PROSPECT_CONFIG.scoutCost) return { ok: false, error: '金币不足，无法进行球探。' };
    const rng = new Rng(randomSeed());
    const prospect = generateProspect(rng);
    set({
      prospects: [prospect, ...s.prospects],
      club: { ...s.club, coins: s.club.coins - PROSPECT_CONFIG.scoutCost },
      coinsLedger: trimmedLedger(s.coinsLedger, [{ id: makeId('led'), delta: -PROSPECT_CONFIG.scoutCost, reason: '青训球探', at: Date.now() }]),
    });
    get().toast(`签下新秀 ${prospect.nickname}（综合 ${prospect.ovr} / 潜力 ${prospect.potential}）。`, 'success');
    void writeSave(get().snapshot());
    return { ok: true };
  },

  promoteProspect: (id: string) => {
    const s = get();
    const prospect = s.prospects.find((p) => p.id === id);
    if (!prospect) return { ok: false, error: '找不到这名新秀。' };
    if (prospect.status !== 'academy') return { ok: false, error: '这名新秀已经不在青训营了。' };
    const template = prospectToTemplate(prospect, 'S' + s.club.season);
    const identity = prospectToIdentity(prospect);
    const card = makeCard(template.id, 1);
    set({
      customTemplates: [...s.customTemplates, template],
      customPlayers: [...s.customPlayers, identity],
      cards: [...s.cards, card],
      prospects: s.prospects.map((p) => (p.id === id ? { ...p, status: 'promoted', signedCardId: card.instanceId } : p)),
    });
    get().toast(`${prospect.nickname} 已提拔进主队。`, 'success');
    void writeSave(get().snapshot());
    return { ok: true };
  },

  releaseProspect: (id: string) => {
    const s = get();
    set({ prospects: s.prospects.filter((p) => p.id !== id) });
    void writeSave(get().snapshot());
  },

  startMatch: (opts) => {
    const s = get();
    const breakdown = s.squadRating(opts.mapId);
    if (breakdown.filled < 5) return { ok: false, error: '阵容需要五名选手才能开始比赛。' };
    const lineup = playerLineupFromSquad(s.snapshot());
    if (lineup.length < 5) return { ok: false, error: '阵容不完整。' };
    const unique = new Set(lineup.map((p) => p.playerId));
    if (unique.size < 5) return { ok: false, error: '同一名选手不能在一套阵容里出现两次。' };

    let opponentName = 'Scrim Opponent';
    let opponentId = opts.opponentId;
    let opponentPlayers: MatchPlayerInit[] = [];
    let brain: AiBrain = brainFromSpec(AI_TEAMS[0]);
    let lineupAsCash = 0;
    const spec: AITeamSpec | undefined = AI_TEAM_MAP[opponentId];
    if (spec) {
      opponentPlayers = lineupFromSpec(spec);
      opponentName = spec.name;
      brain = brainFromSpec(spec);
    } else {
      const fallback = AI_TEAMS[0];
      opponentPlayers = lineupFromSpec(fallback, 2);
      opponentName = fallback.name;
      opponentId = fallback.id;
      brain = brainFromSpec(fallback);
    }
    if (opponentPlayers.length < 5) return { ok: false, error: '对手阵容不可用。' };

    const seed = randomSeed();
    const rng = new Rng(seed);
    const match = createMatch({
      seed,
      mapId: opts.mapId,
      startMoneyBonus: { A: lineupAsCash, B: 0 },
      teamA: { id: 'player', name: s.club.name, shortName: s.club.name.slice(0, 4).toUpperCase(), isPlayer: true, players: lineup },
      teamB: { id: opponentId, name: opponentName, shortName: spec ? spec.shortName : 'OPP', players: opponentPlayers },
      teamAStartsT: rng.chance(0.5),
    });
    const side = match.teams.A.side;
    const suggestedBuy: BuyType = decideBuy(match.teams.A, 1, 0, 'balanced');
    set({
      activeMatch: match,
      activeMatchInfo: { mode: opts.mode, opponentId, opponentName, brain, tournamentId: opts.tournamentId, tournamentMatchId: opts.tournamentMatchId },
      playerOrders: { side, buy: suggestedBuy, tactic: side === 'T' ? tSideTactic(s.tacticDefaults, opts.mapId, opts.tactic) : 'standard_defense', target: 'AUTO' },
      lastSummary: null,
    });
    return { ok: true };
  },

  setPlayerOrders: (patch) => {
    const current = get().playerOrders;
    if (!current) return;
    set({ playerOrders: { ...current, ...patch } });
  },

  playNextRound: () => {
    const s = get();
    const match = s.activeMatch;
    if (!match || !s.activeMatchInfo || !s.playerOrders) return;
    if (isMatchOver(match)) { get().finalizeFromStore(); return; }
    const playerSide = match.teams.A.side;
    const rng = new Rng((match.rngState ^ 0x9e3779b1) >>> 0);
    const aiOrders = decideAiOrders({ match, team: match.teams.B, brain: s.activeMatchInfo.brain, rng });
    const playerOrder: RoundOrders = {
      side: playerSide,
      buy: s.playerOrders.buy,
      tactic: s.playerOrders.tactic,
      target: s.playerOrders.target,
    };
    const validTactic = tacticsForSide(playerSide).some((t) => t.id === playerOrder.tactic);
    if (!validTactic) playerOrder.tactic = playerSide === 'T' ? 'default' : 'standard_defense';
    const orders: TeamRoundOrders = playerSide === 'T'
      ? { t: playerOrder, ct: aiOrders }
      : { t: aiOrders, ct: playerOrder };
    playRound(match, orders);
    const cloned: MatchState = { ...match, rounds: [...match.rounds], events: [...match.events], scoreHistory: [...match.scoreHistory] };
    set({ activeMatch: cloned });
    syncOrdersToSide(match);
    if (isMatchOver(cloned)) get().finalizeFromStore();
  },

  autoPlay: () => {
    const s = get();
    const match = s.activeMatch;
    if (!match || !s.activeMatchInfo) return;
    let guard = 0;
    while (!isMatchOver(match) && guard < 80) {
      guard += 1;
      const playerSide = match.teams.A.side;
      const rng = new Rng((match.rngState ^ 0x9e3779b1) >>> 0);
      const aiOrders = decideAiOrders({ match, team: match.teams.B, brain: s.activeMatchInfo.brain, rng });
      const playerOrder: RoundOrders = {
        side: playerSide,
        buy: decideBuy(match.teams.A, match.roundNumber, match.overtime, 'balanced'),
        tactic: playerSide === 'T' ? 'default' : 'standard_defense',
        target: 'AUTO',
      };
      const orders: TeamRoundOrders = playerSide === 'T'
        ? { t: playerOrder, ct: aiOrders }
        : { t: aiOrders, ct: playerOrder };
      playRound(match, orders);
    }
    const cloned: MatchState = { ...match, rounds: [...match.rounds], events: [...match.events], scoreHistory: [...match.scoreHistory] };
    set({ activeMatch: cloned });
    get().finalizeFromStore();
  },

  finalizeFromStore: () => {
    const s = get();
    const match = s.activeMatch;
    const info = s.activeMatchInfo;
    if (!match || !info) return;
    if (s.matches.some((m) => m.id === match.id)) { set({ activeMatch: null, activeMatchInfo: null }); return; }

    const board = buildScoreboard(match);
    const mvp = pickMvp(board);
    const playerWon = match.winner === 'A';
    const playerTeam = match.teams.A;
    const opponentTeam = match.teams.B;
    const playerTemplates: Record<string, CardTemplate> = {};
    const templates = s.templates();
    s.cards.forEach((c) => {
      const tpl = templates[c.templateId];
      if (tpl) playerTemplates[tpl.id] = tpl;
    });
    const playerRating = (s.leaders.find((l) => l.id === 'player')?.rating) ?? 1000;
    const oppRating = (s.leaders.find((l) => l.id === info.opponentId)?.rating) ?? 1200;
    const rewards = computeMatchRewards({
      won: playerWon, playerRating, opponentRating: oppRating,
      templates: playerTemplates,
      mvp: mvp && mvp.teamId === playerTeam.id ? mvp : null,
      rounds: match.rounds.length,
    });

    const keyRounds = match.rounds
      .filter((r) => r.bombPlanted || r.reason === 'defuse' || r.events.some((e) => e.text.includes('ACE')))
      .slice(-5)
      .map((r) => ({
        roundNumber: r.roundNumber,
        winner: r.winner,
        text: 'Round ' + r.roundNumber + ': ' + (r.reason === 'bomb' ? 'bomb detonation' : r.reason === 'defuse' ? 'clutch defuse' : r.reason === 'time' ? 'time expired' : 'elimination') + ' (' + r.scoreT + ':' + r.scoreCT + ')',
      }));

    const summary: MatchSummary = {
      id: match.id,
      playedAt: Date.now(),
      mapId: match.mapId,
      opponentName: info.opponentName,
      teamName: s.club.name,
      scoreFor: playerTeam.score,
      scoreAgainst: opponentTeam.score,
      won: playerWon,
      roundsPlayed: match.rounds.length,
      seed: match.seed,
      scoreboard: board,
      mvp,
      coins: rewards.coins,
      xp: rewards.clubXp,
      keyRounds,
      mode: info.mode,
      tournamentId: info.tournamentId,
    };

    const squadIds = new Set(COMBAT_ROLES.map((r) => s.squad.slots[r]).filter((x): x is string => Boolean(x)));
    const cards = s.cards.map((c) => (squadIds.has(c.instanceId) ? recomputeLevel({ ...c, xp: c.xp + rewards.cardXpPerPlayer }) : c));
    const ratingDelta = eloDelta(playerRating, oppRating, playerWon);
    let club: ClubState = addClubXp({
      ...s.club,
      coins: s.club.coins + rewards.coins,
      wins: s.club.wins + (playerWon ? 1 : 0),
      losses: s.club.losses + (playerWon ? 0 : 1),
      streak: playerWon ? Math.max(1, s.club.streak + 1) : Math.min(-1, s.club.streak - 1),
    }, rewards.clubXp);
    let leaders = updateLeaderboard(s.leaders, 'player', playerWon, ratingDelta);
    leaders = tickLeaderboard(leaders, new Rng(randomSeed()));
    let tasks = applyTaskProgress(s.tasks, 'play_match', 1);
    if (playerWon) tasks = applyTaskProgress(tasks, 'win_match', 1);
    let tournaments = s.tournaments;
    let career = { ...s.career };
    let extraCoins = 0;

    if (info.tournamentId) {
      const t = s.tournaments.find((x) => x.id === info.tournamentId);
      const tm = t && info.tournamentMatchId ? t.matches.find((m) => m.id === info.tournamentMatchId) : null;
      if (t && tm) {
        let updated = reportPlayerMatch(t, tm.id, playerWon, playerTeam.score, opponentTeam.score);
        updated = settleAiMatches(updated, updated.seed + match.rounds.length);
        leaders = applyAiResults(leaders, t, updated);
        if (updated.status === 'completed' && updated.championId === 'player') {
          extraCoins += updated.prizePool;
          career.titles += 1;
          career.tierPoints += 3;
          career.honors = [
            ...(career.honors ?? []),
            { id: 'h-' + updated.id, name: updated.name, tier: updated.tier, wonAt: Date.now(), prize: updated.prizePool },
          ].slice(-40);
        }
        if (updated.status === 'completed' && updated.championId && updated.championId !== 'player') {
          const champId = updated.championId;
          const prev = (get().teamHonors ?? {})[champId] ?? [];
          set({
            teamHonors: {
              ...(get().teamHonors ?? {}),
              [champId]: [...prev, { id: 'h-' + updated.id, name: updated.name, tier: updated.tier, wonAt: Date.now(), prize: updated.prizePool }].slice(-20),
            },
          });        }
        if (updated.status === 'completed') career = { ...career, completedTournaments: career.completedTournaments + 1, activeTournamentId: null };
        tournaments = [updated, ...s.tournaments.filter((x) => x.id !== updated.id)];
        leaders = leaders.map((l) => {
          const team = updated.teams.find((x) => x.id === l.id);
          if (!team || l.id === 'player') return l;
          return { ...l, rating: Math.max(900, Math.round((l.rating + team.rating) / 2)) };
        });
      }
    }

    if (extraCoins > 0) {
      club = { ...club, coins: club.coins + extraCoins };
      get().toast(`夺得赛事冠军！奖金 ${extraCoins} 金币。`, 'success');
    }

    leaders = leaders.map((l) => (l.id === 'player' ? { ...l, tier: career.tier } : l));

    // 正式比赛（联赛 / 赛事）让现任主教练积累执教经验；友谊赛与快速模拟不计。
    const coachGrowth = awardCoachXp(s, info.mode, playerWon);

    set({
      club, cards, leaders, tasks, tournaments, career,
      coachXp: coachGrowth.coachXp,
      coaches: coachGrowth.coaches,
      squad: {
        ...s.squad,
        synergy: bumpSynergy(s.squad.synergy),
        matchesTogether: s.squad.matchesTogether + 1,
      },
      matches: [summary, ...s.matches].slice(0, 100),
      coinsLedger: trimmedLedger(s.coinsLedger, [
        { id: makeId('led'), delta: rewards.coins + extraCoins, reason: playerWon ? '比赛胜利 + 战利品' : '比赛出场费', at: Date.now() },
      ]),
      lastSummary: summary,
      activeMatch: null,
      activeMatchInfo: null,
      playerOrders: null,
    });

    void writeReplay({
      id: match.id, at: Date.now(), mapId: match.mapId,
      result: playerTeam.score + ':' + opponentTeam.score,
      events: match.events,
      rounds: match.rounds,
    });
    void writeSave(get().snapshot());
    get().toast(playerWon ? `以 ${playerTeam.score}:${opponentTeam.score} 拿下比赛——+${rewards.coins} 金币。` : `以 ${playerTeam.score}:${opponentTeam.score} 输掉比赛——+${rewards.coins} 金币。`, playerWon ? 'success' : 'info');
  },

  quitMatch: () => set({ activeMatch: null, activeMatchInfo: null, playerOrders: null }),

  enterTournament: (tier: number, eventId?: string) => {
    const s = get();
    const playerRating = s.leaders.find((l) => l.id === 'player')?.rating ?? 1000;
    if (!canEnterTier(playerRating, tier)) {
      return { ok: false, error: pickText('你还差 ' + (tierSpec(tier).ratingFloor - playerRating) + ' 分才能报名' + tierSpec(tier).name + '（需要 ' + tierSpec(tier).ratingFloor + ' 分）。', 'You need ' + (tierSpec(tier).ratingFloor - playerRating) + ' more rating to enter ' + i18nT('tier.' + tier) + ' (requires ' + tierSpec(tier).ratingFloor + ').') };
    }
    const active = s.tournaments.find((t) => t.status === 'active');
    if (active) return { ok: false, error: pickText('先打完当前赛事再报名新的。', 'Finish the current event before entering a new one.') };

    const tournament = createTournament({
      tier, playerTeamName: s.club.name, playerRating, seed: randomSeed(),
    });
    const settled = settleAiMatches(tournament, tournament.seed);
    set({
      tournaments: [settled, ...s.tournaments].slice(0, 12),
      career: { ...s.career, tier, activeTournamentId: settled.id },
      // Keep the leaderboard row's league in sync with the career ladder.
      leaders: applyAiResults(s.leaders.map((l) => (l.id === 'player' ? { ...l, tier } : l)), null, settled),
    });
    get().toast(pickText('已报名' + tierSpec(tier).name + '。', 'Entered ' + i18nT('tier.' + tier) + '.'), 'success');
    void writeSave(get().snapshot());
    return { ok: true };
  },

  registerEvent: (eventId: string) => {
    const s = get();
    const event = seasonEvents(s.club.season).find((e) => e.id === eventId);
    if (!event) return { ok: false, error: pickText('找不到这站赛事。', 'Event not found.') };
    if (s.club.day > event.closeDay) return { ok: false, error: pickText('报名已经截止了（截止日 ' + monthDayLabel(event.closeDay) + '）。', 'Registration has closed (deadline ' + monthDayLabel(event.closeDay) + ').') };
    const playerRating = s.leaders.find((l) => l.id === 'player')?.rating ?? 1000;
    if (!canEnterTier(playerRating, event.tier)) {
      return { ok: false, error: pickText('你的积分还不够参加' + tierSpec(event.tier).name + '（需要 ' + tierSpec(event.tier).ratingFloor + ' 分）。', 'Your rating is too low for ' + i18nT('tier.' + event.tier) + ' (needs ' + tierSpec(event.tier).ratingFloor + ').') };
    }
    if ((s.career.registeredEventIds ?? []).includes(eventId)) return { ok: false, error: pickText('这一站你已经报名了。', 'You are already registered for this event.') };
    set({ career: { ...s.career, registeredEventIds: [...(s.career.registeredEventIds ?? []), eventId] } });
    get().toast(pickText('已报名' + event.name + '，比赛日 ' + monthDayLabel(event.day) + '。', 'Registered for ' + event.nameEn + ' — race day ' + monthDayLabel(event.day) + '.'), 'success');
    void writeSave(get().snapshot());
    return { ok: true };
  },

  unregisterEvent: (eventId: string) => {
    const s = get();
    set({ career: { ...s.career, registeredEventIds: (s.career.registeredEventIds ?? []).filter((id) => id !== eventId) } });
    void writeSave(get().snapshot());
  },

  startEvent: (eventId: string) => {
    const s = get();
    const event = seasonEvents(s.club.season).find((e) => e.id === eventId);
    if (!event) return { ok: false, error: pickText('找不到这站赛事。', 'Event not found.') };
    if (!(s.career.registeredEventIds ?? []).includes(eventId)) return { ok: false, error: pickText('还没有报名这一站。', 'You are not registered for this event.') };
    if (s.club.day < event.day) {
      return { ok: false, error: pickText('比赛日还没到：' + monthDayLabel(event.day) + '，当前 ' + monthDayLabel(s.club.day) + '。', 'Race day has not arrived yet: ' + monthDayLabel(event.day) + ', currently ' + monthDayLabel(s.club.day) + '.') };
    }
    return get().enterTournament(event.tier, eventId);
  },

  advanceDays: (days: number) => {
    const s = get();
    const next = Math.min(SEASON_DAYS, Math.max(1, s.club.day + Math.max(1, Math.round(days))));
    set({ club: { ...s.club, day: next, week: Math.ceil(next / 7) } });
    void writeSave(get().snapshot());
  },

  startRegisteredEvent: () => {
    const s = get();
    const events = seasonEvents(s.club.season).filter((e) => (s.career.registeredEventIds ?? []).includes(e.id));
    const ready = events.find((e) => s.club.day >= e.day);
    if (!ready) {
      return { ok: false, error: events.length ? pickText('比赛日还没到，先把时间推进到比赛日。', 'Race day has not arrived — advance the calendar first.') : pickText('还没有报名任何赛事。', 'You are not registered for any event.') };
    }
    return get().startEvent(ready.id);
  },
 
  startTournamentMatch: () => {
    const s = get();
    const tournament = s.tournaments.find((t) => t.status === 'active');
    if (!tournament) return { ok: false, error: 'No active tournament — enter one from the Career page.' };
    if (isEliminated(tournament)) return { ok: false, error: 'You were eliminated from this tournament.' };
    const match = playerNextMatch(tournament);
    if (!match) return { ok: false, error: 'No match is ready right now. Simulate the remaining fixtures.' };
    const opponent = opponentOf(tournament, match);
    if (!opponent) return { ok: false, error: 'Opponent could not be resolved.' };
    return get().startMatch({
      mapId: match.mapId,
      opponentId: opponent.id,
      mode: 'tournament',
      tournamentId: tournament.id,
      tournamentMatchId: match.id,
    });
  },

  simulateCareerSeason: (tournamentId: string) => {
    const s = get();
    const start = s.tournaments.find((t) => t.id === tournamentId);
    if (!start) return { ok: false, error: pickText('没有找到这场赛事。', 'Event not found.') };
    if (start.status === 'completed') return { ok: false, error: pickText('这场赛事已经结束了。', 'This event has already finished.') };
    if (isEliminated(start)) {
      get().simulateTournamentRemainder(tournamentId);
      return { ok: false, error: pickText('你已经在这轮赛事中被淘汰了，仅结算了剩余赛程。', 'You were eliminated from this event; only the remaining fixtures were settled.') };
    }

    let played = 0;
    let guard = 0;
    while (guard < 8) {
      guard += 1;
      const current = get().tournaments.find((t) => t.id === tournamentId);
      if (!current || current.status === 'completed' || isEliminated(current)) break;
      if (!playerNextMatch(current)) break;
      const started = get().startTournamentMatch();
      if (!started.ok) return { ok: false, error: started.error };
      get().autoPlay();
      played += 1;
    }

    const after = get().tournaments.find((t) => t.id === tournamentId);
    if (after && after.status !== 'completed') get().simulateTournamentRemainder(tournamentId);

    const final = get().tournaments.find((t) => t.id === tournamentId);
    const champion = final?.teams.find((x) => x.id === final.championId) ?? null;
    if (champion?.id === 'player') {
      get().toast(`🏆 快速模拟完成：你赢下了 ${final?.name ?? '赛事'}（${played} 场），奖金已入账。`, 'success');
    } else {
      get().toast(`快速模拟完成：打了 ${played} 场，冠军是 ${champion?.name ?? '未知'}。`, 'info');
    }
    return { ok: true, matchesPlayed: played, champion: champion?.name };
  },
  simulateTournamentRemainder: (tournamentId: string) => {
    const s = get();
    const t = s.tournaments.find((x) => x.id === tournamentId);
    if (!t) return;
    const multi = t.format && t.format !== 'single';
    // 多败赛制里，玩家出局后直接把赛事收尾（没有 AI 对阵树可模拟）
    if (multi && isEliminated(t)) {
      const finished = { ...t };
      finaliseTournament(finished);
      const champ = finished.teams.find((x) => x.id === finished.championId);
      set({ tournaments: s.tournaments.map((x) => (x.id === tournamentId ? finished : x)) });
      void writeSave(get().snapshot());
      get().toast('赛事结束，冠军：' + (champ ? champ.name : '未知') + '。你的名次：' + (finished.placement ?? '—') + '。', 'success');
      return;
    }
    const mine = playerNextMatch(t);
    const settled = settleAiMatches(t, t.seed + s.tournaments.length);
    const played = settled.matches.filter((m, i) => {
      const before = t.matches[i];
      return m.winnerId !== null && (!before || before.winnerId === null);
    }).length;
    set({
      tournaments: s.tournaments.map((x) => (x.id === tournamentId ? settled : x)),
      leaders: applyAiResults(s.leaders, t, settled),
    });
    void writeSave(get().snapshot());

    if (mine) {
      const foe = opponentOf(settled, mine);
      get().toast(
        '已模拟 ' + played + ' 场 AI 对局。你的对手' + (foe ? '（' + foe.name + '）' : '') + '还需要你亲自打完，赛程才能继续推进。',
        'info',
      );
      return;
    }
    if (settled.status === 'completed') {
      const champ = settled.teams.find((x) => x.id === settled.championId);
      get().toast('赛事结束，冠军：' + (champ ? champ.name : '未知') + '。', 'success');
      return;
    }
    get().toast(played > 0 ? '已模拟 ' + played + ' 场 AI 对局。' : '当前赛程已经全部结算完毕。', 'info');
  },

  claimAchievement: (id) => {
    const s = get();
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (!ach) return { ok: false, error: pickText('不存在的成就。', 'No such achievement.') };
    if (s.claimedAchievements.includes(id)) return { ok: false, error: pickText('已经领取过了。', 'Already claimed.') };
    if (ach.value(s.snapshot()) < ach.target) return { ok: false, error: pickText('成就还没达成。', 'Achievement not reached yet.') };
    set({
      claimedAchievements: [...s.claimedAchievements, id],
      club: { ...s.club, coins: s.club.coins + ach.reward },
      coinsLedger: trimmedLedger(s.coinsLedger, [{ id: makeId('led'), delta: ach.reward, reason: '成就：' + ach.name, at: Date.now() }]),
    });
    get().toast(pickText('成就「' + ach.name + '」+ ' + ach.reward + ' 金币。', 'Achievement "' + ach.nameEn + '" + ' + ach.reward + ' coins.'), 'success');
    void writeSave(get().snapshot());
    return { ok: true };
  },
  openCoachPack: (count: number) => {
    const s = get();
    const price = count >= 10 ? COACH_PACK.ten : COACH_PACK.single;
    if (s.club.coins < price) { get().toast('金币不足，需要 ' + price + ' 金币。', 'error'); return null; }
    const rng = new Rng(randomSeed());
    const pulls: OwnedCoach[] = [];
    const results: CoachPull[] = [];
    const owned = [...(s.coaches ?? [])];
    for (let i = 0; i < count; i += 1) {
      const roll = rng.next() * 100;
      const tier = roll < COACH_TIER_META.S.weight ? 'S' : roll < COACH_TIER_META.S.weight + COACH_TIER_META.A.weight ? 'A' : roll < COACH_TIER_META.S.weight + COACH_TIER_META.A.weight + COACH_TIER_META.B.weight ? 'B' : 'C';
      const pool = COACHES.filter((c) => coachTier(c.ability) === tier);
      const pick = pool[rng.int(0, pool.length - 1)] ?? COACHES[0];
      const existing = owned.find((c) => c.coachId === pick.id);
      if (existing) existing.xp += 25;
      else owned.push({ instanceId: makeId('coach'), coachId: pick.id, xp: 0 });
      pulls.push({ instanceId: 'tmp-' + i, coachId: pick.id, xp: 0 });
      results.push({ coachId: pick.id, isNew: !existing, xpGained: existing ? 25 : 0 });
    }
    set({
      lastCoachResults: results,
      coaches: owned,
      club: { ...s.club, coins: s.club.coins - price },
      coinsLedger: trimmedLedger(s.coinsLedger, [{ id: makeId('led'), delta: -price, reason: count >= 10 ? '教练十连' : '教练单抽', at: Date.now() }]),
    });
    get().toast('签下 ' + pulls.length + ' 位教练（重复的转为执教经验）。', 'success');
    void writeSave(get().snapshot());
    return pulls;
  },

  clearCoachResults: () => set({ lastCoachResults: null }),

  setLiveWorld: (enabled) => {
    set({ liveWorld: { ...get().liveWorld, enabled } });
    void writeSave(get().snapshot());
  },

  tickLiveWorld: () => {
    const s = get();
    if (!s.liveWorld.enabled) return;
    const rng = new Rng(randomSeed());
    const before = new Map(s.leaders.map((l) => [l.id, l.rating]));
    const leaders = tickLeaderboard(s.leaders, rng);
    const moved = leaders
      .filter((l) => !l.isPlayer && before.get(l.id) !== l.rating)
      .sort((a, b) => Math.abs((b.rating - (before.get(b.id) ?? b.rating))) - Math.abs((a.rating - (before.get(a.id) ?? a.rating))))
      .slice(0, 3);
    const now = Date.now();
    const feed = moved.map((l) => ({
      id: makeId('feed'),
      text: l.name + ' 升至 ' + l.rating + ' 分（' + (l.rating - (before.get(l.id) ?? l.rating) > 0 ? '+' : '') + (l.rating - (before.get(l.id) ?? l.rating)) + '）',
      textEn: l.name + ' climbs to ' + l.rating + ' pts (' + (l.rating - (before.get(l.id) ?? l.rating) > 0 ? '+' : '') + (l.rating - (before.get(l.id) ?? l.rating)) + ')',
      at: now,
    }));
    set({
      leaders,
      liveWorld: {
        enabled: true,
        lastTickAt: now,
        ticks: s.liveWorld.ticks + 1,
        feed: [...feed, ...s.liveWorld.feed].slice(0, 8),
      },
    });
    if (s.settings.autoSave) void writeSave(get().snapshot());
  },
  renameClub: (name) => {
    const s = get();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 12) return { ok: false, error: '名称需要 2-12 个字符。' };
    if (trimmed === s.club.name) return { ok: false, error: '新名称与当前名称相同。' };
    if (s.club.coins < CLUB_PRICES.rename) return { ok: false, error: '金币不足，改名需要 ' + CLUB_PRICES.rename + ' 金币。' };
    set({
      club: { ...s.club, name: trimmed, coins: s.club.coins - CLUB_PRICES.rename },
      coinsLedger: trimmedLedger(s.coinsLedger, [{ id: makeId('led'), delta: -CLUB_PRICES.rename, reason: '俱乐部改名', at: Date.now() }]),
    });
    get().toast('俱乐部已更名为「' + trimmed + '」。', 'success');
    void writeSave(get().snapshot());
    return { ok: true };
  },

  setClubLook: (badge, color) => {
    const s = get();
    if (s.club.badge === badge && s.club.color === color) return { ok: false, error: '与当前徽章相同。' };
    if (s.club.coins < CLUB_PRICES.badge) return { ok: false, error: '金币不足，更换徽章需要 ' + CLUB_PRICES.badge + ' 金币。' };
    set({
      club: { ...s.club, badge, color, coins: s.club.coins - CLUB_PRICES.badge },
      coinsLedger: trimmedLedger(s.coinsLedger, [{ id: makeId('led'), delta: -CLUB_PRICES.badge, reason: '更换俱乐部徽章', at: Date.now() }]),
    });
    get().toast('俱乐部徽章已更新。', 'success');
    void writeSave(get().snapshot());
    return { ok: true };
  },
  celebrate: (c) => {
    const id = makeId('cel');
    set({ celebration: { id, title: c.title, subtitle: c.subtitle, tone: c.tone ?? 'level' } });
    setTimeout(() => {
      const cur = get().celebration;
      if (cur && cur.id === id) set({ celebration: null });
    }, 2200);
  },

  clearCelebration: () => set({ celebration: null }),

  setHeadCoach: (instanceId: string | null) => {
    const s = get();
    set({ headCoachId: instanceId });
    get().toast(instanceId ? '已任命新任主教练。' : '已卸任主教练。', 'success');
    void writeSave(get().snapshot());
  },

  setDefaultTactic: (mapId, tacticId) => {
    const s = get();
    const defaults = { ...(s.tacticDefaults ?? {}) };
    // 传空字符串表示取消该图的默认战术。
    if (!tacticId) delete defaults[mapId];
    else defaults[mapId] = tacticId;
    set({ tacticDefaults: defaults });
    void writeSave(get().snapshot());
  },
  grantTestCoins: (amount) => {
    const s = get();
    const coins = Math.max(0, Math.floor(amount));
    set({
      club: { ...s.club, coins: s.club.coins + coins },
      coinsLedger: trimmedLedger(s.coinsLedger, [
        { id: makeId('led'), delta: coins, reason: '调试：测试金币', at: Date.now() },
      ]),
    });
    get().toast('已发放测试金币 +' + coins.toLocaleString() + '。', 'success');
    void writeSave(get().snapshot());
  },

  updateSettings: (patch) => {
    set({ settings: { ...get().settings, ...patch } });
    void writeSave(get().snapshot());
  },
}));

/** T 侧开赛战术：玩家指定 > 该图默认 > 引擎默认；未知战术 id 一律回退。 */
function tSideTactic(defaults: Partial<Record<MapId, string>> | undefined, mapId: MapId, explicit?: string): string {
  const valid = (id: string | undefined): id is string => Boolean(id) && tacticsForSide('T').some((t) => t.id === id);
  if (valid(explicit)) return explicit;
  const stored = defaults?.[mapId];
  if (valid(stored)) return stored;
  return 'default';
}

const COACH_MATCH_XP = { win: 18, loss: 12 } as const;

/** 现任主教练的赛后执教经验（胜 +18 / 负 +12），返回新的经验表与教练列表。 */
function awardCoachXp(
  state: Pick<GameStore, 'coaches' | 'coachXp' | 'headCoachId'>,
  mode: ActiveMatchInfo['mode'],
  won: boolean,
): { coachXp: Record<string, number>; coaches: OwnedCoach[] } {
  const coaches = state.coaches ?? [];
  const coachXp = { ...(state.coachXp ?? {}) };
  const head = coaches.find((c) => c.instanceId === state.headCoachId);
  if (!head || (mode !== 'career' && mode !== 'tournament')) return { coachXp, coaches };
  const total = ownedCoachXp(head, coachXp) + (won ? COACH_MATCH_XP.win : COACH_MATCH_XP.loss);
  coachXp[head.instanceId] = total;
  return { coachXp, coaches: coaches.map((c) => (c.instanceId === head.instanceId ? { ...c, xp: total } : c)) };
}

function trimmedLedger(ledger: GameSnapshot['coinsLedger'], entries: GameSnapshot['coinsLedger']): GameSnapshot['coinsLedger'] {
  return [...entries, ...ledger].slice(0, 120);
}
export function aiOpponents(): AITeamSpec[] {
  return [...AI_TEAMS].sort((a, b) => a.tier - b.tier || b.rating - a.rating);
}

export function matchMapOptions(): MapId[] {
  return [...MAP_IDS];
}

export function tacticInfo(id: string): Tactic | null {
  try {
    return tacticById(id);
  } catch {
    return null;
  }
}

export function activeTacticOptions(side: Side): Tactic[] {
  return tacticsForSide(side);
}

export function syncOrdersToSide(match: MatchState): void {
  const state = useGameStore.getState();
  const orders = state.playerOrders;
  if (!orders) return;
  const side = match.teams.A.side;
  const options = tacticsForSide(side).map((t) => t.id);
  const patch: Partial<RoundOrders> = {};
  if (orders.side !== side) patch.side = side;
  if (!options.includes(orders.tactic)) patch.tactic = options[0] ?? 'default';
  if (Object.keys(patch).length > 0) state.setPlayerOrders(patch);
}
