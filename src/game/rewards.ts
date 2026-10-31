import type { CardTemplate, ClubState, MatchStatLine, TaskProgress } from '@/types';
import { ECONOMY, LEVEL_CONFIG, SYNERGY } from '@/data/config';
import { levelFromXp } from '@/engine/rating';

export interface MatchRewardInput {
  won: boolean;
  playerRating: number;
  opponentRating: number;
  templates: Record<string, CardTemplate>;
  mvp: MatchStatLine | null;
  rounds: number;
}

export interface MatchRewardOutput {
  coins: number;
  clubXp: number;
  cardXpPerPlayer: number;
  sponsorBonus: number;
}

export function computeMatchRewards(input: MatchRewardInput): MatchRewardOutput {
  const base = input.won ? ECONOMY.winReward : ECONOMY.lossReward;
  // 对手越强，赢下来的奖金越高：每 1 点评分差额外 0.9 金币，上限 2000。
  const gap = Math.max(0, input.opponentRating - input.playerRating);
  const upset = input.won ? Math.round(Math.min(2000, gap * 0.9)) : 0;
  // 输给远强于自己的对手也有安慰奖金（最高 300）。
  const brave = input.won ? 0 : Math.round(Math.min(300, gap * 0.15));
  let sponsor = 0;
  Object.values(input.templates).forEach((tpl) => {
    if (tpl.skill.kind === 'economy' && input.won) sponsor += tpl.skill.value;
  });
  const mvpBonus = input.mvp ? 25 : 0;
  const longMatch = input.rounds > 26 ? 40 : 0;
  return {
    coins: base + upset + brave + sponsor + mvpBonus + longMatch,
    clubXp: input.won ? ECONOMY.xpPerWin : ECONOMY.xpPerLoss,
    cardXpPerPlayer: input.won ? 120 : 70,
    sponsorBonus: sponsor,
  };
}

export function clubLevelInfo(xp: number): { level: number; intoLevel: number; required: number; progress: number } {
  let level = 1;
  let remaining = xp;
  let required = ECONOMY.clubLevelXpBase;
  while (remaining >= required && level < 30) {
    remaining -= required;
    level += 1;
    required = ECONOMY.clubLevelXpBase + (level - 1) * ECONOMY.clubLevelXpStep;
  }
  return { level, intoLevel: remaining, required, progress: Math.min(1, remaining / required) };
}

export function addClubXp(club: ClubState, xp: number): ClubState {
  const total = club.xp + xp;
  const info = clubLevelInfo(total);
  return { ...club, xp: total, level: Math.max(club.level, info.level) };
}

export function applyTaskProgress(tasks: TaskProgress[], taskId: string, amount = 1): TaskProgress[] {
  return tasks.map((t) => {
    if (t.id !== taskId) return t;
    return { ...t, progress: Math.min(t.target, t.progress + amount) };
  });
}

export function claimTask(tasks: TaskProgress[], taskId: string): { tasks: TaskProgress[]; reward: number } {
  const target = tasks.find((t) => t.id === taskId);
  if (!target || target.claimed || target.progress < target.target) return { tasks, reward: 0 };
  return {
    tasks: tasks.map((t) => (t.id === taskId ? { ...t, claimed: true } : t)),
    reward: target.reward,
  };
}

export function bumpSynergy(current: number, gained = SYNERGY.perMatchGain): number {
  return Math.min(SYNERGY.max, Math.round((current + gained) * 10) / 10);
}

export function cardLevelFromXp(xp: number): number {
  return levelFromXp(xp);
}

export function xpForNextLevel(level: number): number {
  return LEVEL_CONFIG.xpTable[Math.min(LEVEL_CONFIG.xpTable.length - 1, level)] ?? 0;
}