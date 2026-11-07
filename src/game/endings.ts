import type { GameSnapshot } from '@/types';
import { clearedTiers, maxConsecutiveMajors, seasonsLed } from '@/game/milestones';

/**
 * 多结局：只读现有的 career / club / honors 字段，判定「生涯到了哪一步」。
 * 结局只做展示与一次性结算文案，不改变游戏循环——玩家永远可以「继续游戏」。
 * 结算记录写进 claimedAchievements（前缀 ending:），旧存档不需要新增字段。
 */
export const ENDING_CLAIM_PREFIX = 'ending:';

export type EndingId = 'bankrupt' | 'dynasty' | 'sweep' | 'legend';

export interface Ending {
  id: EndingId;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  /** 结局是否已经触发。 */
  triggered: (s: GameSnapshot) => boolean;
  /** 展示用的进度。 */
  progress: (s: GameSnapshot) => { value: number; target: number };
}

const honorsOf = (s: GameSnapshot) => s.career?.honors ?? [];

export const ENDINGS: Ending[] = [
  {
    id: 'bankrupt',
    name: '破产清算',
    nameEn: 'Bankrupt',
    desc: '金币归零，而且已经连输 3 场——董事会给你最后一次机会。',
    descEn: 'Zero coins and three straight losses — the board hands you one last chance.',
    triggered: (s) => (s.club?.coins ?? 1) <= 0 && (s.club?.streak ?? 0) <= -3,
    progress: (s) => ({ value: Math.max(0, -(s.club?.streak ?? 0)), target: 3 }),
  },
  {
    id: 'dynasty',
    name: '王朝加冕',
    nameEn: 'Dynasty crowned',
    desc: '连续三座冠军都是 MAJOR——你已经把这段生涯打成了王朝。',
    descEn: 'Three MAJOR titles back to back — this career has become a dynasty.',
    triggered: (s) => maxConsecutiveMajors(s) >= 3,
    progress: (s) => ({ value: maxConsecutiveMajors(s), target: 3 }),
  },
  {
    id: 'sweep',
    name: '大满贯',
    nameEn: 'Grand slam',
    desc: '十档赛事的冠军全部到手，没有留下任何空白。',
    descEn: 'Every tier on the circuit has a title with your name on it.',
    triggered: (s) => clearedTiers(s) >= 10,
    progress: (s) => ({ value: clearedTiers(s), target: 10 }),
  },
  {
    id: 'legend',
    name: '传奇生涯',
    nameEn: 'Legendary career',
    desc: '带队满 10 个赛季，并且至少拿下 5 座冠军。',
    descEn: 'Ten seasons at the helm and at least five titles won.',
    triggered: (s) => seasonsLed(s) >= 10 && (s.career?.titles ?? 0) >= 5,
    progress: (s) => ({ value: Math.min(seasonsLed(s), s.career?.titles ?? 0), target: 5 }),
  },
];

/** 结局在 claimedAchievements 里的结算记录 id。 */
export function endingClaimId(id: EndingId): string {
  return ENDING_CLAIM_PREFIX + id;
}

export function isEndingRecorded(claimed: string[] | undefined, id: EndingId): boolean {
  return (claimed ?? []).includes(endingClaimId(id));
}

/** 所有已经触发的结局（按定义顺序）。 */
export function triggeredEndings(s: GameSnapshot): Ending[] {
  return ENDINGS.filter((e) => e.triggered(s));
}

/** 已经触发但还没写进档案的结局。 */
export function pendingEndings(s: GameSnapshot, claimed: string[] | undefined): Ending[] {
  return triggeredEndings(s).filter((e) => !isEndingRecorded(claimed, e.id));
}

/** 存档里 MAJOR 冠军数量，面板展示用。 */
export function majorHonorCount(s: GameSnapshot): number {
  return honorsOf(s).filter((h) => h.tier >= 9).length;
}
