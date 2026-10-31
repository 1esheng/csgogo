import type {
  AttributeKey, Attributes, CardTemplate, CombatRole, MapId, OwnedCard, Role, RoleProficiency, Skill,
} from '@/types';
import { COMBAT_WEIGHTS, LEVEL_CONFIG, OVR_BLEND, ROLE_GROWTH, ROLE_WEIGHTS, STAR_CONFIG, TEAM_FACTOR_WEIGHTS } from '@/data/config';
import { RARITIES } from '@/types';

/** Points unlocked by a level (total accumulated attribute points). */
export function growthPointsForLevel(level: number): number {
  const lv = Math.max(1, Math.min(LEVEL_CONFIG.maxLevel, level));
  return (lv - 1) * LEVEL_CONFIG.growthPointsPerLevel;
}

/**
 * Permanent attribute growth granted by levelling. Points are spent in the
 * role's growth order, so a Support card never becomes an AWPer clone.
 */
export function growthFor(template: CardTemplate, level: number, growth = template.growth): Attributes {
  const points = Math.floor(growthPointsForLevel(level) * growth);
  const out: Attributes = { ...template.attributes };
  const order = ROLE_GROWTH[template.primaryRole as CombatRole] ?? ROLE_GROWTH.Entry;
  for (let i = 0; i < points; i += 1) {
    const key = order[i % order.length];
    out[key] = out[key] + 1;
  }
  return out;
}

/** 星级带来的全属性加成（每星 +3）。 */
export function starBonus(stars = 1): number {
  return Math.max(0, Math.min(STAR_CONFIG.maxStars, stars) - 1) * STAR_CONFIG.bonusPerStar;
}

/** Effective attributes for an owned card: template base + level growth + skill bonus + star bonus. */
export function effectiveAttributes(template: CardTemplate, level: number, stars = 1): Attributes {
  const attrs = growthFor(template, level);
  if (template.skill.kind === 'attribute' && (ATTRIBUTE_SET.has(template.skill.key))) {
    const k = template.skill.key as AttributeKey;
    attrs[k] = attrs[k] + template.skill.value;
  }
  const bonus = starBonus(stars);
  if (bonus > 0) {
    // 属性没有上限：星级加成直接叠加，强者可以一直变强
    (Object.keys(attrs) as AttributeKey[]).forEach((key) => {
      attrs[key] = attrs[key] + bonus;
    });
  }
  return attrs;
}

/** 属性没有上限，这个函数只用于界面提示。 */
export function attributeCapFor(_stars = 1): number {
  return Number.POSITIVE_INFINITY;
}

const ATTRIBUTE_SET = new Set<string>([
  'aim', 'reflex', 'positioning', 'gameSense', 'utility', 'teamwork', 'clutch', 'leadership',
]);

export function effectiveProficiency(template: CardTemplate, stars = 1): RoleProficiency {
  const bonus = Math.max(0, starBonus(stars) - Math.floor(starBonus(stars) / 3));
  const out = { ...template.proficiency };
  (Object.keys(out) as (keyof RoleProficiency)[]).forEach((role) => {
    out[role] = out[role] + bonus;
  });
  return out;
}

export function weightedAttributeScore(attributes: Attributes, role: Role): number {
  const weights = ROLE_WEIGHTS[role];
  let total = 0;
  let sum = 0;
  (Object.keys(weights) as AttributeKey[]).forEach((key) => {
    total += attributes[key] * weights[key];
    sum += weights[key];
  });
  return sum > 0 ? total / sum : 0;
}

/**
 * 个人能力分：与位置无关的通用对枪/处理球能力（类似 HLTV 的 rating 基准），
 * 这样不同位置的选手可以横向比较，不会被位置权重扭曲。
 */
export function individualScore(attributes: Attributes): number {
  return (Object.keys(COMBAT_WEIGHTS) as AttributeKey[]).reduce(
    (acc, key) => acc + attributes[key] * COMBAT_WEIGHTS[key],
    0,
  );
}

/** 指挥与团队贡献：把领导力/配合/道具组织折算成 0-100 的团队分。 */
export function teamFactor(attributes: Attributes): number {
  const w = TEAM_FACTOR_WEIGHTS;
  return (
    attributes.leadership * w.leadership
    + attributes.teamwork * w.teamwork
    + attributes.utility * w.utility
  );
}

export interface OvrBreakdown {
  attributes: number;
  proficiency: number;
  team: number;
  total: number;
}

/**
 * 综合评分 = 0.66 × 位置加权能力 + 0.19 × 位置熟练度 + 0.15 × 指挥/团队贡献。
 * 拆解结果用于卡牌详情展示，保证界面数字与实际计算一致。
 */
export function ovrBreakdown(attributes: Attributes, proficiency: RoleProficiency, role: Role): OvrBreakdown {
  const base = individualScore(attributes);
  const prof = proficiency[role] ?? 0;
  const team = teamFactor(attributes);
  const total = Math.round(
    base * OVR_BLEND.attributes + prof * OVR_BLEND.proficiency + team * OVR_BLEND.team,
  );
  return {
    attributes: Math.round(base * OVR_BLEND.attributes),
    proficiency: Math.round(prof * OVR_BLEND.proficiency),
    team: Math.round(team * OVR_BLEND.team),
    total,
  };
}

export function roleOVR(attributes: Attributes, proficiency: RoleProficiency, role: Role): number {
  return ovrBreakdown(attributes, proficiency, role).total;
}

/** Aggregated card rating shown on the card face (primary role). */
export function cardOVR(template: CardTemplate, level: number, stars = 1): number {
  return roleOVR(effectiveAttributes(template, level, stars), effectiveProficiency(template, stars), template.primaryRole);
}

export function cardOVRForRole(template: CardTemplate, level: number, role: Role, stars = 1): number {
  return roleOVR(effectiveAttributes(template, level, stars), effectiveProficiency(template, stars), role);
}

/** 0-100 fit of a card in a squad slot. 100 = perfectly natural position. */
export function roleFit(template: CardTemplate, slot: CombatRole): number {
  const prof = template.proficiency[slot] ?? 0;
  const natural = template.primaryRole === slot;
  const secondary = template.secondaryRole === slot;
  const roleNote = natural ? 1 : secondary ? 0.85 : 0.6;
  return Math.round(Math.max(0, Math.min(100, prof * roleNote)));
}

export interface SlotRating {
  instanceId: string;
  templateId: string;
  playerId: string;
  nickname: string;
  slot: CombatRole;
  ovr: number;
  fit: number;
  natural: boolean;
  effective: number;
}

/** Per-slot effective rating: how good this card actually is in this slot. */
export function slotRating(
  card: OwnedCard,
  template: CardTemplate,
  slot: CombatRole,
  isIGL: boolean,
): SlotRating {
  const attrs = effectiveAttributes(template, card.level, card.stars ?? 1);
  const prof = effectiveProficiency(template);
  const base = roleOVR(attrs, prof, slot);
  const fit = roleFit(template, slot);
  let effective = base * (0.82 + (fit / 100) * 0.18);
  if (isIGL) {
    const iglAttrs: Attributes = { ...attrs };
    const iglScore = 0.75 * weightedAttributeScore(iglAttrs, 'IGL') + 0.25 * (prof.IGL ?? 0);
    effective = effective * 0.94 + iglScore * 0.06;
  }
  return {
    instanceId: card.instanceId,
    templateId: template.id,
    playerId: template.playerId,
    nickname: '',
    slot,
    ovr: base,
    fit,
    natural: template.primaryRole === slot,
    effective: Math.round(effective * 10) / 10,
  };
}

export function mapComfort(template: CardTemplate, mapId: MapId): number {
  let value = template.mapProficiency[mapId] ?? 60;
  if (template.skill.kind === 'map' && template.skill.key === mapId) value += template.skill.value;
  return Math.max(0, Math.min(100, value));
}

export function clutchSkillBonus(template: CardTemplate): number {
  return template.skill.kind === 'clutch' ? template.skill.value : 0;
}

export function skillOf(template: CardTemplate): Skill {
  return template.skill;
}

export function rarityRank(rarity: string): number {
  return RARITIES.indexOf(rarity as never);
}

export const XP_FOR_LEVEL = LEVEL_CONFIG.xpTable;

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_CONFIG.xpTable.length; i += 1) {
    if (xp >= LEVEL_CONFIG.xpTable[i]) level = i + 1;
  }
  return Math.min(LEVEL_CONFIG.maxLevel, level);
}

export function xpProgress(xp: number): { level: number; current: number; required: number; pct: number } {
  const level = levelFromXp(xp);
  if (level >= LEVEL_CONFIG.maxLevel) {
    return { level, current: 1, required: 1, pct: 1 };
  }
  const floor = LEVEL_CONFIG.xpTable[level - 1];
  const next = LEVEL_CONFIG.xpTable[level];
  const current = xp - floor;
  const required = next - floor;
  return { level, current, required, pct: Math.max(0, Math.min(1, current / required)) };
}