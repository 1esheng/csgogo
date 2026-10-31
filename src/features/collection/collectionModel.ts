import type { CardTemplate, CombatRole, OwnedCard, PlayerIdentity, Rarity, Role, SquadState } from '@/types';
import { COMBAT_ROLES, RARITIES, ROLE_LABEL } from '@/types';
import { cardOVR } from '@/engine/rating';

export type CollectionSort = 'ovr-desc' | 'ovr-asc' | 'rarity' | 'level' | 'newest' | 'nickname';

export interface CollectionFilters {
  query: string;
  rarities: Rarity[];
  role: 'ALL' | Role;
  sort: CollectionSort;
  inSquadOnly: boolean;
}

export const DEFAULT_FILTERS: CollectionFilters = {
  query: '',
  rarities: [],
  role: 'ALL',
  sort: 'ovr-desc',
  inSquadOnly: false,
};

export const SORT_OPTIONS: { value: CollectionSort; label: string }[] = [
  { value: 'ovr-desc', label: '综合评分：高→低' },
  { value: 'ovr-asc', label: '综合评分：低→高' },
  { value: 'rarity', label: '稀有度：高→低' },
  { value: 'level', label: '等级：高→低' },
  { value: 'newest', label: '最新获得' },
  { value: 'nickname', label: '昵称：A→Z' },
];

export const ROLE_OPTIONS: { value: 'ALL' | Role; label: string }[] = [
  { value: 'ALL', label: '全部位置' },
  ...COMBAT_ROLES.map((role) => ({ value: role as 'ALL' | Role, label: ROLE_LABEL[role] })),
  { value: 'IGL', label: 'IGL（指挥熟练度 60+）' },
];

export interface CollectionItem {
  instanceId: string;
  template: CardTemplate;
  nickname: string;
  countryCode: string;
  ovr: number;
  level: number;
  stars: number;
  xp: number;
  acquiredAt: number;
  copies: number;
  squadRole: CombatRole | null;
  isIGL: boolean;
}

/**
 * Joins owned cards with their templates and player identities, and annotates
 * each copy with its squad position and how many copies of it are owned.
 */
export function buildCollectionItems(
  cards: OwnedCard[],
  templates: Record<string, CardTemplate>,
  players: Record<string, PlayerIdentity>,
  squad: SquadState,
): CollectionItem[] {
  const copies = new Map<string, number>();
  cards.forEach((card) => copies.set(card.templateId, (copies.get(card.templateId) ?? 0) + 1));
  const roleByInstance = new Map<string, CombatRole>();
  COMBAT_ROLES.forEach((role) => {
    const instanceId = squad.slots[role];
    if (instanceId) roleByInstance.set(instanceId, role);
  });

  const items: CollectionItem[] = [];
  cards.forEach((card) => {
    const template = templates[card.templateId];
    if (!template) return;
    const identity = players[template.playerId];
    items.push({
      instanceId: card.instanceId,
      template,
      nickname: identity ? identity.nickname : template.playerId,
      countryCode: identity ? identity.countryCode : '--',
      ovr: cardOVR(template, card.level, card.stars ?? 1),
      level: card.level,
      stars: card.stars ?? 1,
      xp: card.xp,
      acquiredAt: card.acquiredAt,
      copies: copies.get(card.templateId) ?? 1,
      squadRole: roleByInstance.get(card.instanceId) ?? null,
      isIGL: squad.igl === card.instanceId,
    });
  });
  return items;
}

/** Role filter: natural, secondary, or genuinely IGL-capable cards. */
function matchesRole(item: CollectionItem, role: 'ALL' | Role): boolean {
  if (role === 'ALL') return true;
  if (item.template.primaryRole === role || item.template.secondaryRole === role) return true;
  return role === 'IGL' && (item.template.proficiency.IGL ?? 0) >= 60;
}

export function applyCollectionFilters(items: CollectionItem[], filters: CollectionFilters): CollectionItem[] {
  const needle = filters.query.trim().toLowerCase();
  const raritySet = new Set<Rarity>(filters.rarities);
  const filtered = items.filter((item) => {
    if (needle && !item.nickname.toLowerCase().includes(needle)) return false;
    if (raritySet.size > 0 && !raritySet.has(item.template.rarity)) return false;
    if (filters.role !== 'ALL' && !matchesRole(item, filters.role)) return false;
    if (filters.inSquadOnly && !item.squadRole && !item.isIGL) return false;
    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (filters.sort) {
      case 'ovr-asc':
        return a.ovr - b.ovr || a.nickname.localeCompare(b.nickname);
      case 'rarity':
        return (RARITIES.indexOf(b.template.rarity) - RARITIES.indexOf(a.template.rarity)) || b.ovr - a.ovr;
      case 'level':
        return b.level - a.level || b.xp - a.xp;
      case 'newest':
        return b.acquiredAt - a.acquiredAt;
      case 'nickname':
        return a.nickname.localeCompare(b.nickname);
      case 'ovr-desc':
      default:
        return b.ovr - a.ovr || a.nickname.localeCompare(b.nickname);
    }
  });
  return sorted;
}

export function rarityBreakdown(items: CollectionItem[]): Record<Rarity, number> {
  const counts: Record<Rarity, number> = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
  items.forEach((item) => { counts[item.template.rarity] += 1; });
  return counts;
}