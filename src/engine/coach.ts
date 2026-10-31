import type { CoachIdentity } from '@/data/coaches';

export interface CoachEffects {
  /** 全队属性加成（每名选手 8 项能力）。 */
  attributeBonus: number;
  /** 训练获得的经验加成（0.15 = +15%）。 */
  trainingXpPct: number;
  /** 对手临场适应力削减比例（0.25 = 对手适应力 ×0.75）。 */
  opponentAdaptivityCut: number;
  /** 每回合额外的经济（用于更稳的强起/半买）。 */
  economyBonus: number;
}

/** 一名教练能给球队带来的实际收益——数值全部由执教能力与风格推导，界面直接展示。 */
export function coachEffects(coach?: CoachIdentity | null): CoachEffects {
  if (!coach) return { attributeBonus: 0, trainingXpPct: 0, opponentAdaptivityCut: 0, economyBonus: 0 };
  const a = coach.ability;
  const base = {
    attributeBonus: Math.round(a / 25),
    trainingXpPct: 0,
    opponentAdaptivityCut: 0,
    economyBonus: 0,
  };
  switch (coach.style) {
    case '培养':
      return { ...base, trainingXpPct: Math.round(a * 0.6) / 100 };
    case '战术':
      return { ...base, opponentAdaptivityCut: Math.round(a * 0.35) / 100 };
    case '执教纪律':
      return { ...base, economyBonus: Math.round(a * 0.6) };
    case '临场':
      return { ...base, opponentAdaptivityCut: Math.round(a * 0.2) / 100, economyBonus: Math.round(a * 0.3) };
    default:
      return base;
  }
}