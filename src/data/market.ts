import type { CardTemplate, Rarity } from '@/types';
import { RARITY_TABLE } from '@/data/config';

export interface MarketOffer {
  id: string;
  templateId: string;
  price: number;
  sold: boolean;
}

const BASE_PRICE: Record<Rarity, number> = { N: 350, R: 700, SR: 1600, SSR: 3600, UR: 7200 };

/** 根据卡牌稀有度与综合评分估算售价。 */
export function cardPrice(template: CardTemplate, ovr: number): number {
  const base = BASE_PRICE[template.rarity] ?? 600;
  const bump = Math.max(0, ovr - 70) * 60;
  return Math.round((base + bump) / 10) * 10;
}

/** 生成转会市场报价：每周刷新，价格随稀有度与评分变化。 */
export function makeOffers(
  pool: CardTemplate[],
  ovrOf: (t: CardTemplate) => number,
  seed: number,
  count = 6,
): MarketOffer[] {
  let s = seed >>> 0 || 1;
  const next = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
  const list = [...pool];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, count).map((tpl, i) => ({
    id: 'off-' + seed + '-' + i,
    templateId: tpl.id,
    price: cardPrice(tpl, ovrOf(tpl)),
    sold: false,
  }));
}

export const RARITY_ORDER: Rarity[] = ['UR', 'SSR', 'SR', 'R', 'N'];
export const RARITY_NAME = (r: Rarity) => RARITY_TABLE[r].label;