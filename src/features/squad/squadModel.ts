import type { CardTemplate, CombatRole, MapId, OwnedCard, PlayerIdentity, Rarity, Role } from '@/types';
import type { PlayerCardView } from '@/components/PlayerCard';
import { cardOVR, mapComfort } from '@/engine/rating';
import type { SquadBreakdown } from '@/engine/squad';

/** Everything the squad page needs to render one occupied position. */
export interface SlotCardInfo {
  instanceId: string;
  template: CardTemplate;
  nickname: string;
  countryCode: string;
  level: number;
  /** OVR the card actually delivers in this slot (from the engine breakdown). */
  ovr: number;
  fit: number;
  natural: boolean;
  isIGL: boolean;
  mapComfort: number | null;
  rarity: Rarity;
  primaryRole: Role;
}

export function initials(nickname: string): string {
  const clean = nickname.replace(/[^A-Za-z0-9]/g, '');
  return clean.slice(0, 2).toUpperCase() || 'CS';
}

export function cardViewOf(card: OwnedCard, template: CardTemplate, identity?: PlayerIdentity): PlayerCardView {
  return {
    template,
    nickname: identity ? identity.nickname : template.playerId,
    countryCode: identity ? identity.countryCode : '??',
    ovr: cardOVR(template, card.level, card.stars ?? 1),
    level: card.level,
    stars: card.stars ?? 1,
    mastery: card.mastery,
  };
}

export function buildSlotInfos(input: {
  slots: SquadBreakdown['slots'];
  cards: OwnedCard[];
  templates: Record<string, CardTemplate>;
  players: Record<string, PlayerIdentity>;
  igl: string | null;
  mapId: MapId;
}): Record<CombatRole, SlotCardInfo | null> {
  const byInstance = new Map(input.cards.map((card) => [card.instanceId, card]));
  const out: Record<CombatRole, SlotCardInfo | null> = {
    AWPer: null, Entry: null, Lurker: null, Support: null, Anchor: null,
  };
  input.slots.forEach((entry) => {
    if (!entry.instanceId) return;
    const card = byInstance.get(entry.instanceId);
    if (!card) return;
    const template = input.templates[card.templateId];
    if (!template) return;
    const identity = input.players[template.playerId];
    out[entry.slot] = {
      instanceId: card.instanceId,
      template,
      nickname: identity ? identity.nickname : template.playerId,
      countryCode: identity ? identity.countryCode : '??',
      level: card.level,
      ovr: entry.ovr,
      fit: entry.fit,
      natural: entry.natural,
      isIGL: input.igl === card.instanceId,
      mapComfort: mapComfort(template, input.mapId),
      rarity: template.rarity,
      primaryRole: template.primaryRole,
    };
  });
  return out;
}