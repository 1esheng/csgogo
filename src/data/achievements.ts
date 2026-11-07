import type { GameSnapshot } from '@/types';
import { coachLevel, ownedCoachXp } from '@/game/starter';
import { starsOf } from '@/types';
import { TEMPLATE_MAP } from '@/data/cards';
import { COACH_MAP, coachTier } from '@/data/coaches';

export interface Achievement {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  target: number;
  reward: number;
  value: (s: GameSnapshot) => number;
}

const totalStars = (s: GameSnapshot) => s.cards.reduce((sum, c) => sum + (starsOf(c) - 1), 0);
const uniquePlayers = (s: GameSnapshot) => new Set(s.cards.map((c) => c.templateId)).size;

/** 卡牌稀有度：先查内置模板，再查存档里生成的青训/自定义模板。 */
const rarityOf = (s: GameSnapshot, templateId: string) =>
  TEMPLATE_MAP[templateId]?.rarity ?? (s.customTemplates ?? []).find((t) => t.id === templateId)?.rarity;

/** 拥有的不同 UR 卡数量。 */
const uniqueUR = (s: GameSnapshot) => new Set(
  s.cards.filter((c) => rarityOf(s, c.templateId) === 'UR').map((c) => c.templateId),
).size;

const maxCardStars = (s: GameSnapshot) => s.cards.reduce((max, c) => Math.max(max, starsOf(c)), 0);
const maxCardLevel = (s: GameSnapshot) => s.cards.reduce((max, c) => Math.max(max, c.level), 0);

/** 不败场数：club.streak 为正代表连续不败，为负代表连败；对局没有平局，所以连胜即不败。 */
const unbeatenRun = (s: GameSnapshot) => Math.max(0, s.club.streak);

const honorsOf = (s: GameSnapshot) => s.career.honors ?? [];

/** 真正上过场的最高赛事档位——「打进 MAJOR」按实际打过一场 MAJOR 正赛判定。 */
const bestPlayedTier = (s: GameSnapshot) => s.tournaments.reduce((best, t) => {
  const played = t.matches.some((m) => m.winnerId !== null && (m.aId === t.playerTeamId || m.bId === t.playerTeamId));
  return played ? Math.max(best, t.tier) : best;
}, 0);

/** 已经拿过冠军的档位数量（十档联赛全部通关 = 每个档位都夺冠过）。 */
const clearedTiers = (s: GameSnapshot) => new Set(honorsOf(s).map((h) => h.tier)).size;

/** 主教练等级；还没任命主教练（或旧存档没有教练经验）时按 0 级处理，即未达成。 */
const headCoachLevel = (s: GameSnapshot) => {
  const head = (s.coaches ?? []).find((c) => c.instanceId === s.headCoachId);
  if (!head) return 0;
  return coachLevel(ownedCoachXp(head, s.coachXp));
};

/** 拥有的 S 级教练数量。 */
const sTierCoaches = (s: GameSnapshot) => (s.coaches ?? [])
  .filter((c) => coachTier(COACH_MAP[c.coachId]?.ability ?? 0) === 'S')
  .length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'win1', name: '首胜', nameEn: 'First Victory', desc: '赢下第一场正式比赛。', descEn: 'Win your first competitive match.', target: 1, reward: 500, value: (s) => s.club.wins },
  { id: 'win25', name: '磨合完成', nameEn: 'Fully Gelled', desc: '累计赢下 25 场比赛。', descEn: 'Win 25 matches in total.', target: 25, reward: 3000, value: (s) => s.club.wins },
  { id: 'win100', name: '老牌强队', nameEn: 'Established Powerhouse', desc: '累计赢下 100 场比赛。', descEn: 'Win 100 matches in total.', target: 100, reward: 12000, value: (s) => s.club.wins },
  { id: 'title1', name: '首个冠军', nameEn: 'First Trophy', desc: '赢下一届赛事的冠军。', descEn: 'Take home your first event title.', target: 1, reward: 4000, value: (s) => s.career.titles },
  { id: 'title5', name: '王朝开端', nameEn: 'Dynasty Begins', desc: '累计夺冠 5 次。', descEn: 'Win 5 championships in total.', target: 5, reward: 15000, value: (s) => s.career.titles },
  { id: 'tier6', name: '国际赛场', nameEn: 'International Stage', desc: '打进国际邀请赛。', descEn: 'Qualify for the International Invitational.', target: 6, reward: 6000, value: (s) => s.career.tier },
  { id: 'tier9', name: 'MAJOR 队伍', nameEn: 'MAJOR Team', desc: '打进 MAJOR。', descEn: 'Qualify for the MAJOR.', target: 9, reward: 12000, value: (s) => s.career.tier },
  { id: 'cards50', name: '收藏家', nameEn: 'Collector', desc: '拥有 50 名不同选手。', descEn: 'Own 50 different players.', target: 50, reward: 4000, value: uniquePlayers },
  { id: 'cards150', name: '图鉴大师', nameEn: 'Catalog Master', desc: '拥有 150 名不同选手。', descEn: 'Own 150 different players.', target: 150, reward: 15000, value: uniquePlayers },
  { id: 'stars10', name: '突破者', nameEn: 'Breakthrough', desc: '累计升星 10 次。', descEn: 'Star up cards 10 times.', target: 10, reward: 3000, value: totalStars },
  { id: 'stars50', name: '全队五星', nameEn: 'Five-star squad', desc: '累计升星 50 次。', descEn: 'Star up cards 50 times.', target: 50, reward: 18000, value: totalStars },
  { id: 'pulls100', name: '开包成瘾', nameEn: 'Pack Addict', desc: '累计开启 100 张卡。', descEn: 'Open 100 cards in total.', target: 100, reward: 5000, value: (s) => s.pack.totalPulls },
  { id: 'train50', name: '魔鬼训练', nameEn: 'Boot Camp', desc: '累计完成 50 次训练。', descEn: 'Complete 50 training sessions.', target: 50, reward: 4000, value: (s) => s.training.length + (s.club.level - 1) * 0 },
  { id: 'squad90', name: '顶尖阵容', nameEn: 'Elite Squad', desc: '俱乐部等级达到 10 级。', descEn: 'Reach club level 10.', target: 10, reward: 8000, value: (s) => s.club.level },

  // 生涯线
  { id: 'major1', name: 'MAJOR 首秀', nameEn: 'MAJOR Debut', desc: '在 MAJOR 正赛中打上第一场比赛。', descEn: 'Play your first MAJOR match.', target: 9, reward: 10000, value: bestPlayedTier },
  { id: 'majorChamp', name: 'MAJOR 冠军', nameEn: 'MAJOR Champion', desc: '捧起一座 MAJOR 冠军奖杯。', descEn: 'Win a MAJOR championship.', target: 1, reward: 25000, value: (s) => honorsOf(s).filter((h) => h.tier >= 9).length },
  { id: 'tierSweep', name: '十档通关', nameEn: 'Ten-tier Sweep', desc: '在全部 10 个档位的赛事中都拿到过冠军。', descEn: 'Win a championship at all 10 tiers.', target: 10, reward: 30000, value: clearedTiers },
  { id: 'unbeaten10', name: '十场不败', nameEn: 'Ten-match Unbeaten Run', desc: '连续 10 场比赛保持不败。', descEn: 'Go 10 matches without a loss.', target: 10, reward: 6000, value: unbeatenRun },

  // 收藏线
  { id: 'ur5', name: '巅峰收藏', nameEn: 'Peak Collection', desc: '集齐 5 张不同的 UR 卡。', descEn: 'Collect 5 different UR cards.', target: 5, reward: 20000, value: uniqueUR },
  { id: 'star5', name: '五星卡', nameEn: 'Five-star Card', desc: '把一张卡牌升到 5 星。', descEn: 'Push a single card to 5 stars.', target: 5, reward: 9000, value: maxCardStars },
  { id: 'level10', name: '十级卡', nameEn: 'Level 10 Card', desc: '把一张卡牌升到 10 级。', descEn: 'Level a single card up to level 10.', target: 10, reward: 7000, value: maxCardLevel },
  { id: 'cards200', name: '图鉴 200', nameEn: 'Catalog 200', desc: '图鉴里收集 200 名不同选手。', descEn: 'Collect 200 different players in your catalog.', target: 200, reward: 20000, value: uniquePlayers },

  // 教练线
  { id: 'coachS1', name: '传奇教头', nameEn: 'Legendary Coach', desc: '签下第一位 S 级教练。', descEn: 'Sign your first S-tier coach.', target: 1, reward: 8000, value: sTierCoaches },
  { id: 'headCoach5', name: '主帅五级', nameEn: 'Head Coach Level 5', desc: '把主教练带到 5 级。', descEn: 'Raise your head coach to level 5.', target: 5, reward: 6000, value: headCoachLevel },
];
