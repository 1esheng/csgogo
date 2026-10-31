import { Crosshair, Crown, Flame, Ghost, Rocket, Shield, Skull, Swords, Target, Zap } from 'lucide-react';

/** 俱乐部改名与换标的价格。 */
export const CLUB_PRICES = { rename: 2000, badge: 1500 };

export const CLUB_BADGES = [
  { id: 'shield', label: '盾牌', icon: Shield },
  { id: 'swords', label: '双剑', icon: Swords },
  { id: 'crosshair', label: '准星', icon: Crosshair },
  { id: 'target', label: '靶心', icon: Target },
  { id: 'flame', label: '烈焰', icon: Flame },
  { id: 'skull', label: '骷髅', icon: Skull },
  { id: 'crown', label: '王冠', icon: Crown },
  { id: 'zap', label: '闪电', icon: Zap },
  { id: 'rocket', label: '火箭', icon: Rocket },
  { id: 'ghost', label: '幽灵', icon: Ghost },
] as const;

export type ClubBadgeId = (typeof CLUB_BADGES)[number]['id'];

export const CLUB_COLORS = ['#F5A623', '#4FA3F7', '#E5484D', '#3ECF8E', '#B87BF7', '#F5D90A', '#FF7A45', '#8B95A5'];

export const DEFAULT_BADGE = 'shield';
export const DEFAULT_COLOR = '#F5A623';

export function badgeIcon(id?: string) {
  return CLUB_BADGES.find((b) => b.id === (id ?? DEFAULT_BADGE)) ?? CLUB_BADGES[0];
}