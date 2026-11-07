import type { GameSnapshot } from '@/types';

/**
 * 王朝里程碑：跨赛季的长期目标。
 * 判定只读现有存档字段，缺字段一律按未达成处理。
 * 领取记录写进 claimedAchievements（前缀 ms:），所以旧存档不需要新增字段。
 */
export const MILESTONE_CLAIM_PREFIX = 'ms:';

/** 最高档赛事（MAJOR）的档位号。 */
export const MAJOR_TIER = 9;

export interface Milestone {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  target: number;
  reward: number;
  value: (s: GameSnapshot) => number;
}

const honorsOf = (s: GameSnapshot) => s.career?.honors ?? [];

/** 连续夺冠的 MAJOR 次数：按夺冠时间排序后取最长的一段。 */
export function maxConsecutiveMajors(s: GameSnapshot): number {
  const honors = [...honorsOf(s)].sort((a, b) => a.wonAt - b.wonAt);
  let run = 0;
  let best = 0;
  honors.forEach((h) => {
    if (h.tier >= MAJOR_TIER) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  });
  return best;
}

/** 0 负夺冠的赛事数（一站赛事全胜登顶）。 */
export function losslessTitles(s: GameSnapshot): number {
  return (s.tournaments ?? []).filter((t) => (
    t.status === 'completed'
    && t.championId !== null
    && t.championId === t.playerTeamId
    && t.playerWins > 0
    && t.playerLosses === 0
  )).length;
}

/** 所有进过首发的卡牌实例：当前首发 + 已保存的比赛计分板。 */
export function startedInstanceIds(s: GameSnapshot): Set<string> {
  const ids = new Set<string>();
  Object.values(s.squad?.slots ?? {}).forEach((id) => { if (id) ids.add(id); });
  if (s.squad?.igl) ids.add(s.squad.igl);
  (s.matches ?? []).forEach((m) => {
    (m.scoreboard ?? []).forEach((line) => { if (line.cardInstanceId) ids.add(line.cardInstanceId); });
  });
  return ids;
}

/** 被提拔进过首发的青训人数。 */
export function academyStarters(s: GameSnapshot): number {
  const started = startedInstanceIds(s);
  return (s.prospects ?? []).filter((p) => (
    p.status === 'promoted' && Boolean(p.signedCardId) && started.has(p.signedCardId as string)
  )).length;
}

/** 让对手全场拿到 3 分以内的胜场数（含零封）。 */
export function shutoutWins(s: GameSnapshot): number {
  return (s.matches ?? []).filter((m) => m.won && m.scoreAgainst <= 3).length;
}

/** 带队赛季数：生涯赛季与俱乐部赛季取较大值（旧存档可能只有其中一个在推进）。 */
export function seasonsLed(s: GameSnapshot): number {
  return Math.max(s.career?.season ?? 1, s.club?.season ?? 1);
}

/** 拿过冠军的档位数量。 */
export function clearedTiers(s: GameSnapshot): number {
  return new Set(honorsOf(s).map((h) => h.tier)).size;
}

/** MAJOR 冠军总数（不要求连续）。 */
export function majorTitles(s: GameSnapshot): number {
  return honorsOf(s).filter((h) => h.tier >= MAJOR_TIER).length;
}

export const MILESTONES: Milestone[] = [
  {
    id: 'three-major', name: '三连 MAJOR', nameEn: 'Three MAJORs in a row',
    desc: '连续三座冠军都是 MAJOR——按夺冠时间排序，中间不能夹别的赛事。',
    descEn: 'Three MAJOR titles back to back: sorted by win date, with no other title in between.',
    target: 3, reward: 30000, value: maxConsecutiveMajors,
  },
  {
    id: 'major-five', name: '五座 MAJOR', nameEn: 'Five MAJORs',
    desc: '累计捧起 5 座 MAJOR 奖杯（不要求连续）。',
    descEn: 'Lift five MAJOR trophies in total (not necessarily consecutive).',
    target: 5, reward: 28000, value: majorTitles,
  },
  {
    id: 'lossless-event', name: '全胜封王', nameEn: 'Flawless Champion',
    desc: '在一站赛事里全胜夺冠（0 负登顶）。',
    descEn: 'Win an event without dropping a single match.',
    target: 1, reward: 12000, value: losslessTitles,
  },
  {
    id: 'five-seasons', name: '五年带队', nameEn: 'Five Seasons at the Helm',
    desc: '带队打满 5 个赛季。',
    descEn: 'Lead the club through five seasons.',
    target: 5, reward: 15000, value: seasonsLed,
  },
  {
    id: 'academy-three', name: '青训三人首发', nameEn: 'Three Academy Starters',
    desc: '提拔 3 名青训新秀，并让他们真的进过首发。',
    descEn: 'Promote three academy prospects and actually start them.',
    target: 3, reward: 10000, value: academyStarters,
  },
  {
    id: 'ten-tiers', name: '十档制霸', nameEn: 'All Ten Tiers',
    desc: '在全部 10 个档位的赛事中都拿过冠军。',
    descEn: 'Win a championship at all ten tiers.',
    target: 10, reward: 30000, value: clearedTiers,
  },
  {
    id: 'shutout-five', name: '五场零封', nameEn: 'Five Shutouts',
    desc: '让对手全场只拿到 3 分以内（含零封），累计 5 场。',
    descEn: 'Hold opponents to three rounds or fewer (shutouts included) in five wins.',
    target: 5, reward: 9000, value: shutoutWins,
  },
  {
    id: 'hundred-wins', name: '百胜王朝', nameEn: 'Hundred-win Dynasty',
    desc: '累计赢下 100 场正式比赛。',
    descEn: 'Win 100 competitive matches.',
    target: 100, reward: 15000, value: (s) => s.club.wins,
  },
  {
    id: 'title-twenty', name: '二十冠王朝', nameEn: 'Twenty Titles',
    desc: '累计夺冠 20 次。',
    descEn: 'Win 20 championships in total.',
    target: 20, reward: 25000, value: (s) => s.career.titles,
  },
  {
    id: 'club-level15', name: '俱乐部十五级', nameEn: 'Club Level 15',
    desc: '把俱乐部等级带到 15 级。',
    descEn: 'Take the club to level 15.',
    target: 15, reward: 10000, value: (s) => s.club.level,
  },
];

/** 里程碑在 claimedAchievements 里的领取记录 id。 */
export function milestoneClaimId(id: string): string {
  return MILESTONE_CLAIM_PREFIX + id;
}

export function isMilestoneClaimed(claimed: string[] | undefined, id: string): boolean {
  return (claimed ?? []).includes(milestoneClaimId(id));
}

export interface MilestoneRow {
  milestone: Milestone;
  value: number;
  done: boolean;
  claimed: boolean;
  pct: number;
}

export function milestoneRows(s: GameSnapshot, claimed: string[] | undefined): MilestoneRow[] {
  return MILESTONES.map((milestone) => {
    const value = milestone.value(s);
    return {
      milestone,
      value,
      done: value >= milestone.target,
      claimed: isMilestoneClaimed(claimed, milestone.id),
      pct: Math.min(100, (value / milestone.target) * 100),
    };
  });
}

export interface MilestoneSummary {
  reached: number;
  claimedCount: number;
  claimable: number;
  coinsClaimed: number;
  coinsClaimable: number;
}

export function milestoneSummary(rows: MilestoneRow[]): MilestoneSummary {
  return {
    reached: rows.filter((r) => r.done).length,
    claimedCount: rows.filter((r) => r.claimed).length,
    claimable: rows.filter((r) => r.done && !r.claimed).length,
    coinsClaimed: rows.filter((r) => r.claimed).reduce((sum, r) => sum + r.milestone.reward, 0),
    coinsClaimable: rows.filter((r) => r.done && !r.claimed).reduce((sum, r) => sum + r.milestone.reward, 0),
  };
}
