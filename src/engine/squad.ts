import type {
  Attributes, CardTemplate, CombatRole, MapId, OwnedCard, SquadState,
} from '@/types';
import { COMBAT_ROLES, ROLE_LABEL } from '@/types';
import { SYNERGY } from '@/data/config';
import {
  effectiveAttributes, effectiveProficiency, mapComfort, roleFit, roleOVR, weightedAttributeScore,
} from '@/engine/rating';

export interface SquadBreakdown {
  ovr: number;
  attack: number;
  defense: number;
  synergy: number;
  chemistry: number;
  iglLeadership: number;
  averageFit: number;
  averageMapComfort: number;
  slots: {
    slot: CombatRole;
    instanceId: string | null;
    nickname: string;
    ovr: number;
    fit: number;
    natural: boolean;
    isIGL: boolean;
  }[];
  warnings: string[];
  filled: number;
}

/** How much each slot contributes to attacking / defending, as a 0-1 weight. */
const ATTACK_WEIGHT: Record<CombatRole, number> = { AWPer: 1, Entry: 1, Lurker: 0.92, Support: 0.62, Anchor: 0.5 };
const DEFENSE_WEIGHT: Record<CombatRole, number> = { AWPer: 0.62, Entry: 0.55, Lurker: 0.72, Support: 0.95, Anchor: 1 };

interface BuildInput {
  squad: SquadState;
  cards: OwnedCard[];
  templates: Record<string, CardTemplate>;
  playerNames: Record<string, string>;
  mapId?: MapId;
}

/** Pair chemistry: shared nationality and natural position complement each other. */
function pairChemistry(a: CardTemplate, b: CardTemplate): number {
  let value = 0;
  if (a.playerId === b.playerId) return 0;
  if (a.playerId.slice(0, 2) === b.playerId.slice(0, 2) && a.playerId === b.playerId) value += 0;
  if (a.primaryRole !== b.primaryRole) value += 1.5;
  return value;
}

export function buildSquadBreakdown(input: BuildInput): SquadBreakdown {
  const { squad, cards, templates, playerNames, mapId } = input;
  const byInstance = new Map(cards.map((c) => [c.instanceId, c]));
  const slots: SquadBreakdown['slots'] = [];
  const warnings: string[] = [];
  const seenPlayers = new Set<string>();
  const usedTemplates: CardTemplate[] = [];
  let attack = 0;
  let defense = 0;
  let attackWeight = 0;
  let defenseWeight = 0;
  let fitSum = 0;
  let mapSum = 0;
  let filled = 0;
  let leadership = 0;

  COMBAT_ROLES.forEach((slot) => {
    const instanceId = squad.slots[slot];
    if (!instanceId) {
      slots.push({ slot, instanceId: null, nickname: '—', ovr: 0, fit: 0, natural: false, isIGL: false });
      return;
    }
    const card = byInstance.get(instanceId);
    const template = card ? templates[card.templateId] : undefined;
    if (!card || !template) {
      slots.push({ slot, instanceId: null, nickname: '—', ovr: 0, fit: 0, natural: false, isIGL: false });
      warnings.push(`位置 ${ROLE_LABEL[slot]} 指向的卡牌已经不在收藏里了。`);
      return;
    }
    if (seenPlayers.has(template.playerId)) {
      warnings.push(`${playerNames[template.playerId] ?? template.playerId} 被重复上场——不允许。`);
      return;
    }
    seenPlayers.add(template.playerId);
    usedTemplates.push(template);
    filled += 1;

    const attrs = effectiveAttributes(template, card.level, card.stars ?? 1);
    const prof = effectiveProficiency(template);
    const isIGL = squad.igl === instanceId;
    const base = roleOVR(attrs, prof, slot);
    const fit = roleFit(template, slot);
    const agility = 0.82 + (fit / 100) * 0.18;
    const effective = base * agility;

    attack += effective * ATTACK_WEIGHT[slot];
    defense += effective * DEFENSE_WEIGHT[slot];
    attackWeight += ATTACK_WEIGHT[slot];
    defenseWeight += DEFENSE_WEIGHT[slot];

    fitSum += fit;
    if (mapId) mapSum += mapComfort(template, mapId);
    if (isIGL) leadership = attrs.leadership;
    if (fit < 55) warnings.push(`${playerNames[template.playerId] ?? template.playerId} 打 ${ROLE_LABEL[slot]} 明显不在位置上。`);

    slots.push({
      slot, instanceId, nickname: playerNames[template.playerId] ?? template.playerId,
      ovr: base, fit, natural: template.primaryRole === slot, isIGL,
    });
  });

  let pairSum = 0;
  let pairs = 0;
  for (let i = 0; i < usedTemplates.length; i += 1) {
    for (let j = i + 1; j < usedTemplates.length; j += 1) {
      pairSum += pairChemistry(usedTemplates[i], usedTemplates[j]);
      pairs += 1;
    }
  }
  const pairBonus = pairs > 0 ? Math.min(SYNERGY.maxPairBonus, pairSum / pairs) : 0;

  if (filled < 5) warnings.push(`只填了 ${filled}/5 个位置——阵容补齐前无法开赛。`);
  if (filled === 5 && !squad.igl) warnings.push('还没有指定场上指挥，默契与中期决策都会受损。');

  const avgEffective = filled > 0 ? slots.reduce((acc, s) => acc + s.ovr * (0.82 + (s.fit / 100) * 0.18), 0) / 5 : 0;
  const synergyMult = 1 + (squad.synergy / 100) * SYNERGY.maxBonus;
  const iglMult = 1 + (leadership / 100) * 0.03;
  const ovr = Math.round(avgEffective * synergyMult * iglMult + pairBonus);

  return {
    ovr,
    // Weighted averages, so both stay on the same 0-100 scale as OVR.
    attack: Math.round((attackWeight > 0 ? attack / attackWeight : 0) * synergyMult),
    defense: Math.round((defenseWeight > 0 ? defense / defenseWeight : 0) * synergyMult),
    synergy: Math.round(squad.synergy),
    chemistry: Math.round(pairBonus * 10) / 10,
    iglLeadership: leadership,
    averageFit: filled ? Math.round(fitSum / filled) : 0,
    averageMapComfort: mapId && filled ? Math.round(mapSum / filled) : 0,
    slots,
    warnings,
    filled,
  };
}

/** Strength of one five-man unit used by the match engine, per map. */
export function squadMatchStrength(input: {
  squad: SquadState;
  cards: OwnedCard[];
  templates: Record<string, CardTemplate>;
  mapId: MapId;
}): { power: number; mapComfort: number; synergy: number; attack: number; defense: number } {
  const { squad, cards, templates, mapId } = input;
  const byInstance = new Map(cards.map((c) => [c.instanceId, c]));
  let power = 0;
  let comfort = 0;
  let count = 0;
  let attack = 0;
  let defense = 0;

  COMBAT_ROLES.forEach((slot) => {
    const instanceId = squad.slots[slot];
    if (!instanceId) return;
    const card = byInstance.get(instanceId);
    const template = card ? templates[card.templateId] : undefined;
    if (!card || !template) return;
    const attrs = effectiveAttributes(template, card.level, card.stars ?? 1);
    const prof = effectiveProficiency(template);
    const base = roleOVR(attrs, prof, slot);
    const fit = roleFit(template, slot);
    const comfortScore = mapComfort(template, mapId);
    power += base * (0.85 + (fit / 100) * 0.15) * (0.94 + comfortScore / 100 * 0.06);
    comfort += comfortScore;
    attack += (slot === 'Entry' || slot === 'AWPer' || slot === 'Lurker' ? base : base * 0.75);
    defense += (slot === 'Anchor' || slot === 'Support' ? base : base * 0.8);
    count += 1;
  });

  const synergyMult = 1 + (squad.synergy / 100) * SYNERGY.maxBonus * 1.5;
  return {
    power: count ? (power / 5) * synergyMult : 0,
    mapComfort: count ? comfort / count : 0,
    synergy: squad.synergy,
    attack: count ? (attack / Math.max(1, count)) * synergyMult : 0,
    defense: count ? (defense / Math.max(1, count)) * synergyMult : 0,
  };
}

export function iglLeadershipOf(squad: SquadState, cards: OwnedCard[], templates: Record<string, CardTemplate>): number {
  if (!squad.igl) return 40;
  const card = cards.find((c) => c.instanceId === squad.igl);
  const template = card ? templates[card.templateId] : undefined;
  if (!template) return 40;
  const attrs: Attributes = effectiveAttributes(template, card!.level, card!.stars ?? 1);
  return Math.round(0.7 * attrs.leadership + 0.3 * weightedAttributeScore(attrs, 'IGL'));
}