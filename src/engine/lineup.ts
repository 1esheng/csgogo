import type {
  AITeamSpec, CardTemplate, CombatRole, MatchPlayerInit, MapId,
} from '@/types';
import { TEMPLATE_MAP, PLAYER_MAP } from '@/data/cards';
import { effectiveAttributes, effectiveProficiency } from '@/engine/rating';

export interface LineupEntry {
  templateId: string;
  role: CombatRole;
  isIGL: boolean;
  level?: number;
  stars?: number;
  cardInstanceId?: string;
}

export function initFromTemplate(entry: LineupEntry, index: number): MatchPlayerInit | null {
  const template: CardTemplate | undefined = TEMPLATE_MAP[entry.templateId];
  if (!template) return null;
  const identity = PLAYER_MAP[template.playerId];
  const level = entry.level ?? 1;
  const stars = entry.stars ?? 1;
  const attributes = effectiveAttributes(template, level, stars);
  return {
    cardInstanceId: entry.cardInstanceId ?? `sim-${template.id}-${index}`,
    templateId: template.id,
    playerId: template.playerId,
    nickname: identity?.nickname ?? template.playerId,
    countryCode: identity?.countryCode ?? 'XX',
    role: entry.role,
    isIGL: entry.isIGL,
    attributes,
    proficiency: effectiveProficiency(template, stars),
    mapProficiency: template.mapProficiency,
    skill: template.skill,
    ovr: Math.round(
      (Object.values(attributes).reduce((a, b) => a + b, 0) / 8) * 0.75
      + (template.proficiency[entry.role] ?? 0) * 0.25,
    ),
  };
}

export function lineupFromEntries(entries: LineupEntry[]): MatchPlayerInit[] {
  return entries
    .map((e, i) => initFromTemplate(e, i))
    .filter((p): p is MatchPlayerInit => p !== null);
}

/** AI 阵容的基础等级；档位越高再加成，让高级赛事真正更难。 */
export const AI_LINEUP_LEVEL = 3;

export function lineupFromSpec(spec: AITeamSpec, levelOverride?: number): MatchPlayerInit[] {
  // 档位越高，AI 卡牌等级与星级越高：MAJOR 的对手基本是满级 5 星
  const level = levelOverride ?? Math.min(5, AI_LINEUP_LEVEL + spec.tier);
  // 档位越高，AI 卡牌星级越高：最高档直接是满星队伍
  const stars = levelOverride ? 1 : Math.min(5, 1 + spec.tier);
  // 档位难度加成：每档 +2 属性（公开写在代码里，不是隐藏随机）
  const bonus = levelOverride ? 0 : spec.tier * 2;
  const players = lineupFromEntries(
    spec.lineup.map((slot) => ({
      templateId: slot.templateId,
      role: slot.role,
      isIGL: slot.isIGL,
      level,
      stars,
      cardInstanceId: `${spec.id}-${slot.templateId}-${slot.role}`,
    })),
  );
  if (bonus === 0) return players;
  return players.map((p) => {
    const attributes = { ...p.attributes };
    (Object.keys(attributes) as (keyof typeof attributes)[]).forEach((k) => { attributes[k] += bonus; });
    return {
      ...p,
      attributes,
      ovr: Math.round((Object.values(attributes).reduce((a, b) => a + b, 0) / 8) * 0.75 + (p.proficiency[p.role] ?? 0) * 0.25),
    };
  });
}

/** 战队真实实力（卡片 OVR 平均值），用于界面展示与难度对比。 */
export function aiTeamOvr(spec: AITeamSpec): number {
  return averageOvr(lineupFromSpec(spec));
}

export function averageOvr(players: MatchPlayerInit[]): number {
  if (!players.length) return 0;
  return Math.round(players.reduce((a, p) => a + p.ovr, 0) / players.length);
}

export function preferredMap(spec: AITeamSpec, seed: number): MapId {
  const pool = spec.mapPref.length ? spec.mapPref : (['Mirage', 'Inferno', 'Nuke'] as MapId[]);
  return pool[seed % pool.length];
}