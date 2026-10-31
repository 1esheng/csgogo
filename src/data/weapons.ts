import type { WeaponSpec } from '@/types';

/** Weapon table. Costs and modifiers are game balance values, not real prices. */
export const WEAPONS: WeaponSpec[] = [
  { id: 'glock', name: 'Glock-18', kind: 'pistol', cost: 0, side: 'T', power: 1.0, precision: 0.42, killReward: 300 },
  { id: 'usp', name: 'USP-S', kind: 'pistol', cost: 0, side: 'CT', power: 1.02, precision: 0.46, killReward: 300 },
  { id: 'p250', name: 'P250', kind: 'strongPistol', cost: 300, side: 'both', power: 1.08, precision: 0.5, killReward: 300 },
  { id: 'deagle', name: 'Desert Eagle', kind: 'strongPistol', cost: 700, side: 'both', power: 1.16, precision: 0.53, killReward: 300 },
  { id: 'mac10', name: 'MAC-10', kind: 'smg', cost: 1050, side: 'T', power: 1.12, precision: 0.5, killReward: 600 },
  { id: 'mp9', name: 'MP9', kind: 'smg', cost: 1250, side: 'CT', power: 1.13, precision: 0.51, killReward: 600 },
  { id: 'galil', name: 'Galil AR', kind: 'rifle', cost: 1800, side: 'T', power: 1.24, precision: 0.6, killReward: 300 },
  { id: 'famas', name: 'FAMAS', kind: 'rifle', cost: 2050, side: 'CT', power: 1.24, precision: 0.6, killReward: 300 },
  { id: 'ak47', name: 'AK-47', kind: 'rifle', cost: 2700, side: 'T', power: 1.34, precision: 0.66, killReward: 300 },
  { id: 'm4a1', name: 'M4A1-S', kind: 'rifle', cost: 2900, side: 'CT', power: 1.33, precision: 0.68, killReward: 300 },
  { id: 'awp', name: 'AWP', kind: 'awp', cost: 4750, side: 'both', power: 1.52, precision: 0.74, killReward: 100 },
];

export const WEAPON_MAP: Record<string, WeaponSpec> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

export function defaultPistol(side: 'T' | 'CT'): WeaponSpec {
  return side === 'T' ? WEAPON_MAP.glock : WEAPON_MAP.usp;
}

export function rifleFor(side: 'T' | 'CT'): WeaponSpec {
  return side === 'T' ? WEAPON_MAP.ak47 : WEAPON_MAP.m4a1;
}

export function smgFor(side: 'T' | 'CT'): WeaponSpec {
  return side === 'T' ? WEAPON_MAP.mac10 : WEAPON_MAP.mp9;
}
