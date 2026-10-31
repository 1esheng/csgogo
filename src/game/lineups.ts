import type { CardTemplate, GameSnapshot, MatchPlayerInit, PlayerIdentity } from '@/types';
import { COMBAT_ROLES } from '@/types';
import { TEMPLATE_MAP, PLAYER_MAP } from '@/data/cards';
import { COACH_MAP } from '@/data/coaches';
import { effectiveAttributes, effectiveProficiency, roleOVR } from '@/engine/rating';

export function registryOf(snapshot: Pick<GameSnapshot, 'customTemplates' | 'customPlayers'>): {
  templates: Record<string, CardTemplate>;
  players: Record<string, PlayerIdentity>;
} {
  const templates: Record<string, CardTemplate> = { ...TEMPLATE_MAP };
  (snapshot.customTemplates ?? []).forEach((t) => { templates[t.id] = t; });
  const players: Record<string, PlayerIdentity> = { ...PLAYER_MAP };
  (snapshot.customPlayers ?? []).forEach((p) => { players[p.id] = p; });
  return { templates, players };
}

export function playerLineupFromSquad(snapshot: GameSnapshot): MatchPlayerInit[] {
  const { templates, players } = registryOf(snapshot);
  const out: MatchPlayerInit[] = [];
  COMBAT_ROLES.forEach((role, index) => {
    const instanceId = snapshot.squad.slots[role];
    if (!instanceId) return;
    const card = snapshot.cards.find((c) => c.instanceId === instanceId);
    if (!card) return;
    const tpl = templates[card.templateId];
    if (!tpl) return;
    const identity = players[tpl.playerId];
    // 主教练加成：执教能力每 25 点给全队 +1 属性
    const head = (snapshot.coaches ?? []).find((c) => c.instanceId === snapshot.headCoachId);
    const coachInfo = head ? COACH_MAP[head.coachId] : undefined;
    const coachBoost = coachInfo ? Math.round(coachInfo.ability / 25) : 0;
    const attributes = effectiveAttributes(tpl, card.level, card.stars ?? 1);
    if (coachBoost > 0) {
      (Object.keys(attributes) as (keyof typeof attributes)[]).forEach((k) => { attributes[k] += coachBoost; });
    }
    const proficiency = effectiveProficiency(tpl);
    out.push({
      cardInstanceId: card.instanceId,
      templateId: tpl.id,
      playerId: tpl.playerId,
      nickname: identity ? identity.nickname : tpl.playerId,
      countryCode: identity ? identity.countryCode : 'XX',
      role,
      isIGL: snapshot.squad.igl === card.instanceId,
      attributes,
      proficiency,
      mapProficiency: tpl.mapProficiency,
      skill: tpl.skill,
      ovr: roleOVR(attributes, proficiency, role),
    });
    void index;
  });
  return out;
}