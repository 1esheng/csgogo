import type { CardTemplate, OwnedCard, PackState, Rarity } from '@/types';
import { PACK_CONFIG, RARITY_TABLE } from '@/data/config';
import { TEMPLATES_BY_RARITY } from '@/data/cards';
import type { Rng } from '@/engine/rng';

export interface PullResult {
  template: CardTemplate;
  rarity: Rarity;
  isNew: boolean;
  shards: number;
  /** 本次抽取是否由保底保证（'SR' = 十抽保底，'SSR' = 六十抽保底）。 */
  pity?: 'SR' | 'SSR';
}

const RARITY_ORDER: Rarity[] = ['N', 'R', 'SR', 'SSR', 'UR'];
const RANK: Record<Rarity, number> = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };

function rollBase(rng: Rng): Rarity {
  const roll = rng.next();
  let cursor = 0;
  for (const rarity of RARITY_ORDER) {
    cursor += RARITY_TABLE[rarity].rate;
    if (roll < cursor) return rarity;
  }
  return 'N';
}

/** Rolls a rarity with the active pity counters applied. */
export function rollRarity(rng: Rng, pack: PackState): Rarity {
  const nextSR = pack.sinceSR + 1;
  const nextSSR = pack.sinceSSR + 1;

  if (nextSSR >= PACK_CONFIG.pitySSR) return rng.chance(0.15) ? 'UR' : 'SSR';
  if (nextSR >= PACK_CONFIG.pitySR) {
    const forced = rollBase(rng);
    return RANK[forced] >= 2 ? forced : 'SR';
  }
  return rollBase(rng);
}

export function pickTemplateOfRarity(rng: Rng, rarity: Rarity): CardTemplate {
  const pool = TEMPLATES_BY_RARITY[rarity];
  if (pool && pool.length) return rng.pick(pool);
  return rng.pick(TEMPLATES_BY_RARITY.N);
}

export interface PullOutcome {
  results: PullResult[];
  pack: PackState;
}

/**
 * Executes `count` pulls. Pity counters move only on real pulls, and every
 * result is returned so the store can write the card into the collection.
 */
export function executePulls(rng: Rng, packStart: PackState, count: number, owned: OwnedCard[]): PullOutcome {
  const pack: PackState = { ...packStart };
  const results: PullResult[] = [];
  const ownedTemplates = new Set(owned.map((c) => c.templateId));

  for (let i = 0; i < count; i += 1) {
    // 先判断本次是否达到保底线，再掷骰，这样界面可以标注"这一抽是保底给的"。
    const forcedSSR = pack.sinceSSR + 1 >= PACK_CONFIG.pitySSR;
    const forcedSR = !forcedSSR && pack.sinceSR + 1 >= PACK_CONFIG.pitySR;
    const rarity = rollRarity(rng, pack);
    const template = pickTemplateOfRarity(rng, rarity);
    const pity: PullResult['pity'] = forcedSSR ? 'SSR' : forcedSR ? 'SR' : undefined;
    pack.sinceSR = RANK[rarity] >= 2 ? 0 : pack.sinceSR + 1;
    pack.sinceSSR = RANK[rarity] >= 3 ? 0 : pack.sinceSSR + 1;
    pack.totalPulls += 1;
    const isNew = !ownedTemplates.has(template.id);
    if (isNew) ownedTemplates.add(template.id);
    results.push({ template, rarity, isNew, pity, shards: isNew ? 0 : PACK_CONFIG.duplicateShards[rarity] });
  }
  return { results, pack };
}

export function pityStatus(pack: PackState): { srIn: number; ssrIn: number; srProgress: number; ssrProgress: number } {
  return {
    srIn: Math.max(0, PACK_CONFIG.pitySR - pack.sinceSR),
    ssrIn: Math.max(0, PACK_CONFIG.pitySSR - pack.sinceSSR),
    srProgress: Math.min(1, pack.sinceSR / PACK_CONFIG.pitySR),
    ssrProgress: Math.min(1, pack.sinceSSR / PACK_CONFIG.pitySSR),
  };
}