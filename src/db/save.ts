import type { CardTemplate, GameSettings, GameSnapshot, LeaderboardEntry, MapId, OwnedCard } from '@/types';
import { MAP_IDS } from '@/types';
import { GAME_VERSION, LEVEL_CONFIG } from '@/data/config';
import { TEMPLATE_MAP } from '@/data/cards';
import { AI_TEAMS, AI_TEAM_MAP } from '@/data/aiTeams';

export interface ValidationResult {
  ok: boolean;
  error?: string;
  snapshot?: GameSnapshot;
}

const NUMERIC_FIELDS = ['version', 'savedAt'];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Structural + version validation for imported saves. Anything structurally
 * wrong is rejected with a human-readable reason instead of half-loading.
 */
export function validateSnapshot(raw: unknown): ValidationResult {
  if (!isObject(raw)) return { ok: false, error: '存档不是一个 JSON 对象。' };
  for (const key of NUMERIC_FIELDS) {
    if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key] as number)) {
      return { ok: false, error: `存档缺少有效的 ${key} 字段。` };
    }
  }
  const version = raw.version as number;
  if (version > GAME_VERSION) {
    return { ok: false, error: `这份存档来自更新的游戏版本（${version} > ${GAME_VERSION}），无法读取。` };
  }
  if (!isObject(raw.club)) return { ok: false, error: '存档里没有俱乐部数据。' };
  const club = raw.club as Record<string, unknown>;
  if (typeof club.name !== 'string' || typeof club.coins !== 'number' || !Number.isFinite(club.coins)) {
    return { ok: false, error: '俱乐部数据格式不正确。' };
  }
  if (club.coins < 0) return { ok: false, error: '金币数量不能为负数。' };
  if (!Array.isArray(raw.cards)) return { ok: false, error: '存档里没有卡牌收藏。' };

  // 先做赛季迁移（旧赛季卡 → 当前赛季卡），再按迁移后的结果校验。
  const data = migrateCards(raw as unknown as GameSnapshot) as unknown as Record<string, unknown>;
  const customTemplates = Array.isArray(raw.customTemplates) ? (raw.customTemplates as CardTemplate[]) : [];
  const registry: Record<string, CardTemplate> = { ...TEMPLATE_MAP };
  customTemplates.forEach((t) => { registry[t.id] = t; });

  const instanceIds = new Set<string>();
  for (const card of data.cards as OwnedCard[]) {
    if (!card || typeof card.instanceId !== 'string' || typeof card.templateId !== 'string') {
      return { ok: false, error: '收藏里有一张卡牌数据格式不正确。' };
    }
    if (!registry[card.templateId]) {
      return { ok: false, error: `卡牌引用了未知模板：${card.templateId}。` };
    }
    if (instanceIds.has(card.instanceId)) {
      return { ok: false, error: `卡牌实例重复：${card.instanceId}。` };
    }
    instanceIds.add(card.instanceId);
    if (typeof card.level !== 'number' || card.level < 1 || card.level > LEVEL_CONFIG.maxLevel) {
      return { ok: false, error: `卡牌等级超出范围：${card.instanceId}。` };
    }
  }

  if (!isObject(data.squad)) return { ok: false, error: '存档里没有阵容数据。' };
  const squad = data.squad as Record<string, unknown>;
  if (!isObject(squad.slots)) return { ok: false, error: '阵容位置数据缺失。' };
  const slots = squad.slots as Record<string, unknown>;
  for (const role of ['AWPer', 'Entry', 'Lurker', 'Support', 'Anchor']) {
    const value = slots[role];
    if (value !== null && typeof value !== 'string') {
      return { ok: false, error: `阵容位置 ${role} 非法。` };
    }
    if (typeof value === 'string' && !instanceIds.has(value)) {
      return { ok: false, error: `阵容位置 ${role} 指向一张不存在的卡牌。` };
    }
  }

  const requiredArrays = ['matches', 'prospects', 'leaders', 'tournaments', 'training'];
  for (const key of requiredArrays) {
    if (raw[key] !== undefined && !Array.isArray(raw[key])) {
      return { ok: false, error: `${key} 必须是数组。` };
    }
  }

  const snapshot = raw as unknown as GameSnapshot;
  return { ok: true, snapshot: normalise(snapshot) };
}

/** 战术默认表兜底：只保留 MapId 键与字符串值，非法内容一律丢弃。 */
function sanitizeTacticDefaults(raw: unknown): Partial<Record<MapId, string>> {
  if (!isObject(raw)) return {};
  const out: Partial<Record<MapId, string>> = {};
  MAP_IDS.forEach((id) => {
    const value = raw[id];
    if (typeof value === 'string' && value.length > 0) out[id] = value;
  });
  return out;
}

/** 教练经验表兜底：只保留数字值，负数与非法值归零后丢弃。 */
function sanitizeCoachXp(raw: unknown): Record<string, number> {
  if (!isObject(raw)) return {};
  const out: Record<string, number> = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return;
    out[key] = Math.round(value);
  });
  return out;
}

function normalise(s: GameSnapshot): GameSnapshot {
  const migrated = migrateCards(s);
  return {
    ...s,
    version: GAME_VERSION,
    cards: migrated.cards,
    squad: migrated.squad,
    matches: migrated.matches ?? [],
    prospects: s.prospects ?? [],
    leaders: s.leaders ?? [],
    tournaments: s.tournaments ?? [],
    training: s.training ?? [],
    tasks: s.tasks ?? [],
    coinsLedger: s.coinsLedger ?? [],
    customTemplates: s.customTemplates ?? [],
    customPlayers: s.customPlayers ?? [],
    // 旧存档兼容：战术默认表与教练经验表是后加的字段。
    tacticDefaults: sanitizeTacticDefaults(s.tacticDefaults),
    coachXp: sanitizeCoachXp(s.coachXp),
    settings: {
      ...({
        language: 'zh' as const,
        autoSave: true,
        packSkipAnimation: false,
        compactCards: false,
        matchSpeed: 2,
        showDevPanel: false,
        soundEnabled: false,
      } as const),
      ...((s.settings ?? {}) as Partial<GameSettings>),
    },
  };
}


/**
 * 旧存档兼容：早期版本存在 2018–2025 的赛季卡，现在每位选手只有 2026 赛季一张。
 * 载入时把旧卡映射到对应选手的 2026 卡（保留等级/经验），重复的合并，找不到的直接丢弃，
 * 同时清理指向已不存在卡牌的阵容位置。
 */
const SEASON_ID = /^tpl-(.+)-(\d{4})$/;

export function migrateCards(input: GameSnapshot): GameSnapshot {
  const registry: Record<string, CardTemplate> = { ...TEMPLATE_MAP };
  (input.customTemplates ?? []).forEach((t) => { registry[t.id] = t; });

  const remap = new Map<string, string>();
  const kept = new Map<string, OwnedCard>();
  const cards: OwnedCard[] = [];

  if (!Array.isArray(input.cards)) return input;
  input.cards.forEach((card) => {
    const originalId = card.templateId;
    let templateId = originalId;
    if (!registry[templateId]) {
      const m = SEASON_ID.exec(templateId);
      const upgraded = m ? 'tpl-' + m[1] + '-2026' : null;
      if (upgraded && registry[upgraded]) templateId = upgraded;
      // 认不出来的模板保持原样，交给校验环节明确报错
    }
    const next = { ...card, templateId, stars: card.stars && card.stars >= 1 ? card.stars : 1 };
    // 只有“旧赛季卡映射到新赛季卡”时才需要合并；同名重复卡是合成材料，必须保留。
    if (templateId !== originalId) {
      const existing = kept.get(templateId);
      if (existing) {
        existing.level = Math.max(existing.level, next.level);
        existing.xp = Math.max(existing.xp, next.xp);
        existing.mastery = Math.max(existing.mastery, next.mastery);
        existing.stars = Math.max(existing.stars ?? 1, next.stars ?? 1);
        remap.set(card.instanceId, existing.instanceId);
        return;
      }
      kept.set(templateId, next);
    }
    cards.push(next);
  });

  const resolve = (instanceId: string | null): string | null => {
    if (!instanceId) return null;
    const mapped = remap.get(instanceId) ?? instanceId;
    return cards.some((c) => c.instanceId === mapped) ? mapped : null;
  };

  const slots = { ...(input.squad?.slots ?? {}) } as GameSnapshot['squad']['slots'];
  const usedPlayers = new Set<string>();
  (Object.keys(slots) as (keyof typeof slots)[]).forEach((role) => {
    const resolved = resolve(slots[role] ?? null);
    if (!resolved) { slots[role] = null; return; }
    const card = cards.find((c) => c.instanceId === resolved);
    const playerId = card ? registry[card.templateId]?.playerId : undefined;
    if (!playerId || usedPlayers.has(playerId)) { slots[role] = null; return; }
    usedPlayers.add(playerId);
    slots[role] = resolved;
  });

  return {
    ...input,
    cards,
    leaders: migrateLeaders(input.leaders, (input.career as { recordsVersion?: number } | undefined)?.recordsVersion !== 2),
    club: { ...input.club, day: input.club?.day && input.club.day >= 1 ? input.club.day : 1 },
    career: {
      ...input.career,
      recordsVersion: 2,
      registeredEventIds: input.career?.registeredEventIds
        ?? (input.career?.registeredEventId ? [input.career.registeredEventId] : []),
      registeredEventId: null,
    },
    tournaments: sanitizeTournaments(input.tournaments),
    squad: {
      ...input.squad,
      slots,
      igl: resolve(input.squad?.igl ?? null),
    },
  };
}

/**
 * 旧存档兼容：早期版本的天梯对手是虚构战队（ai-nightfall 之类），
 * 现在统一换成真实战队名单。玩家自己的积分与战绩保持不变，
 * 相同 id 的对手沿用原来的 Elo，其余按当前战队实力重新取值。
 */
export function migrateLeaders(leaders: LeaderboardEntry[] | undefined, reseed = false): LeaderboardEntry[] {
  const list = Array.isArray(leaders) ? leaders : [];
  const player = list.find((l) => l.isPlayer);
  const previous = new Map(list.filter((l) => !l.isPlayer).map((l) => [l.id, l]));
  const rebuilt = AI_TEAMS.map((spec) => {
    const old = previous.get(spec.id);
    // 赛季开始前给每支 AI 战队一份历史战绩，胜率才有意义
    let seed = 0;
    for (let i = 0; i < spec.id.length; i += 1) seed = (seed * 31 + spec.id.charCodeAt(i)) >>> 0;
    // 用哈希位分别决定总场次和胜率，避免同档队伍战绩一模一样
    const total = 22 + (seed % 26);
    const strength = 0.34 + spec.tier * 0.055 + (((seed >> 3) % 23) - 11) / 100;
    const wins = Math.max(3, Math.min(total - 2, Math.round(total * strength)));
    const losses = total - wins;
    return {
      id: spec.id,
      name: spec.name,
      isPlayer: false,
      // 初始分带随机浮动，让每份存档的榜单名次都不一样
      rating: !reseed && old ? old.rating : spec.rating + ((seed >> 11) % 161) - 80,
      wins: !reseed && old && old.wins + old.losses > 0 ? old.wins : wins,
      losses: !reseed && old && old.wins + old.losses > 0 ? old.losses : losses,
      weeks: old?.weeks ?? 0,
      tier: spec.tier,
    };
  });
  const fallbackPlayer: LeaderboardEntry = player ?? {
    id: 'player', name: '我的战队', isPlayer: true, rating: 1000, wins: 0, losses: 0, tier: 0,
  };
  return [fallbackPlayer, ...rebuilt];
}

/**
 * 旧存档里的赛事可能引用已经不存在的虚构战队。
 * 已结束的赛事按历史保留；进行中/未开始的直接作废，让玩家可以重新报名真实赛事。
 */
function sanitizeTournaments(list: GameSnapshot['tournaments'] | undefined) {
  if (!Array.isArray(list)) return [];
  return list.filter((t) => {
    if (t.status === 'completed') return true;
    return t.teams.every((team) => team.isPlayer || Boolean(AI_TEAM_MAP[team.id]));
  });
}

export function snapshotToJson(snapshot: GameSnapshot): string {
  return JSON.stringify({ ...snapshot, savedAt: Date.now() }, null, 2);
}

export function parseSaveFile(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: '文件不是合法的 JSON。' };
  }
  return validateSnapshot(parsed);
}