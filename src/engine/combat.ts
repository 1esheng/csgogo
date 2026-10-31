import type { AttributeKey, MatchPlayerState, MapId } from '@/types';
import { COMBAT_SCALE, COMBAT_WEIGHTS } from '@/data/config';
import { WEAPON_MAP } from '@/data/weapons';
import type { Rng } from '@/engine/rng';

export interface DuelContext {
  mapId: MapId;
  /** + attacking side edge from tactic and map. */
  tacticEdge: number;
  /** + utility advantage held by this side (0-1). */
  utilityEdge: number;
  /** Support from a nearby teammate (0-1). */
  supportEdge: number;
  /** Late-round 1vX situation. */
  clutch: boolean;
  /** First contact of the round (opening duel). */
  opening: boolean;
  /** Defender holds the site. */
  holdingSite: boolean;
  side: 'T' | 'CT';
  /** Signed round-form modifier for this team this round. */
  form?: number;
}

export function mapComfortOf(player: MatchPlayerState, mapId: MapId): number {
  let value = player.mapProficiency[mapId] ?? 60;
  if (player.skill.kind === 'map' && player.skill.key === mapId) value += player.skill.value;
  return Math.max(0, Math.min(100, value));
}

const BASE_WEIGHTS: Record<AttributeKey, number> = { ...COMBAT_WEIGHTS };

/**
 * Context-sensitive combat score. Never a plain attribute average: the weight
 * profile shifts for clutch situations, AWP duels and opening picks.
 */
export function combatScore(player: MatchPlayerState, ctx: DuelContext): number {
  const weights: Record<AttributeKey, number> = { ...BASE_WEIGHTS };
  const weapon = WEAPON_MAP[player.equipment.weaponId] ?? WEAPON_MAP.glock;

  if (ctx.clutch) {
    weights.clutch += 0.12;
    weights.gameSense += 0.02;
    weights.aim -= 0.1;
    weights.teamwork -= 0.04;
  }
  if (weapon.kind === 'awp') {
    weights.aim += 0.06;
    weights.reflex += 0.03;
    weights.positioning += 0.03;
    weights.teamwork -= 0.08;
    weights.utility -= 0.04;
  }
  if (ctx.opening) {
    weights.reflex += 0.05;
    weights.positioning += 0.02;
    weights.gameSense -= 0.04;
    weights.clutch -= 0.03;
  }

  let total = 0;
  let sum = 0;
  (Object.keys(weights) as AttributeKey[]).forEach((key) => {
    total += player.attributes[key] * weights[key];
    sum += weights[key];
  });
  let score = sum > 0 ? total / sum : 0;

  // Weapon: power pulls the score, precision decides raw aim duels.
  score += (weapon.power - 1.25) * 42;
  score += (player.equipment.armor / 100) * 6;
  if (player.equipment.helmet) score += 2.5;

  // Health: wounded players are meaningfully weaker but never helpless.
  score += ((player.hp / 100) - 1) * 16;

  // Map comfort is a real edge, roughly +-4 points across the comfort range.
  score += (mapComfortOf(player, ctx.mapId) - 70) * 0.13;

  score += ctx.form ?? 0;
  score += ctx.tacticEdge * 9;
  score += ctx.utilityEdge * 7;
  score += ctx.supportEdge * 6;
  if (ctx.holdingSite) score += 3;

  if (player.skill.kind === 'attribute') {
    score += player.skill.value * 0.55;
  }
  if (player.skill.kind === 'clutch' && ctx.clutch) {
    score += player.skill.value * 0.7;
  }
  return score;
}

export function winProbability(a: MatchPlayerState, b: MatchPlayerState, ctx: DuelContext, enemyCtx: DuelContext): number {
  const sa = combatScore(a, ctx);
  const sb = combatScore(b, enemyCtx);
  return 1 / (1 + Math.exp(-(sa - sb) / COMBAT_SCALE));
}

export interface DuelResult {
  attackerWins: boolean;
  killerHp: number;
  victimHp: number;
  killed: boolean;
  /** Damage dealt to the victim. */
  damage: number;
  /** Damage the victim dealt back to the killer. */
  returned: number;
  headshot: boolean;
  probability: number;
}

/** Resolves one engagement. Both players can take damage; only the loser can die. */
export function resolveDuel(
  rng: Rng,
  a: MatchPlayerState,
  b: MatchPlayerState,
  ctx: DuelContext,
  enemyCtx: DuelContext,
): DuelResult {
  const p = winProbability(a, b, ctx, enemyCtx);
  const attackerWins = rng.chance(p);
  const winner = attackerWins ? a : b;
  const loser = attackerWins ? b : a;
  const winnerWeapon = WEAPON_MAP[winner.equipment.weaponId] ?? WEAPON_MAP.glock;

  const base = winnerWeapon.kind === 'awp' ? rng.int(85, 130) : rng.int(52, 105);
  const spread = 1 + (rng.next() - 0.5) * 0.18;
  const damage = Math.round(base * spread * (0.85 + winnerWeapon.power * 0.15));
  const killed = damage >= loser.hp;
  const returned = Math.round(damage * (killed ? 0.05 : rng.float(0.1, 0.35)));
  const headshot = rng.chance(winnerWeapon.kind === 'awp' ? 0.28 : 0.42);

  return {
    attackerWins,
    killerHp: Math.max(1, winner.hp - returned),
    victimHp: Math.max(0, loser.hp - damage),
    killed,
    damage,
    returned,
    headshot,
    probability: p,
  };
}

export function weaponName(player: MatchPlayerState): string {
  return (WEAPON_MAP[player.equipment.weaponId] ?? WEAPON_MAP.glock).name;
}
