import type { GameSnapshot } from '@/types';
import { coachLevel, ownedCoachXp } from '@/game/starter';
import { starsOf } from '@/types';
import { PLAYER_MAP, TEMPLATE_MAP } from '@/data/cards';
import { COACH_MAP, coachTier } from '@/data/coaches';

/** 成就分类：成就页按这五类分组与筛选。 */
export type AchievementCategory = 'career' | 'collection' | 'coach' | 'tactic' | 'easter';

export const ACHIEVEMENT_CATEGORIES: { id: AchievementCategory; name: string; nameEn: string }[] = [
  { id: 'career', name: '生涯', nameEn: 'Career' },
  { id: 'collection', name: '收藏', nameEn: 'Collection' },
  { id: 'coach', name: '教练', nameEn: 'Coaching' },
  { id: 'tactic', name: '战术', nameEn: 'Tactics' },
  { id: 'easter', name: '彩蛋', nameEn: 'Easter eggs' },
];

export interface Achievement {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  target: number;
  reward: number;
  /** 分类标签（成就页筛选与分组用）。 */
  category: AchievementCategory;
  value: (s: GameSnapshot) => number;
}

const totalStars = (s: GameSnapshot) => s.cards.reduce((sum, c) => sum + (starsOf(c) - 1), 0);
const uniquePlayers = (s: GameSnapshot) => new Set(s.cards.map((c) => c.templateId)).size;

/** 卡牌稀有度：先查内置模板，再查存档里生成的青训/自定义模板。 */
const rarityOf = (s: GameSnapshot, templateId: string) =>
  TEMPLATE_MAP[templateId]?.rarity ?? (s.customTemplates ?? []).find((t) => t.id === templateId)?.rarity;

/** 模板 → 选手 id（先查内置模板，再查存档里生成的青训模板）。 */
const playerIdOf = (s: GameSnapshot, templateId: string) =>
  TEMPLATE_MAP[templateId]?.playerId ?? (s.customTemplates ?? []).find((t) => t.id === templateId)?.playerId;

/** 拥有的不同 UR 卡数量。 */
const uniqueUR = (s: GameSnapshot) => new Set(
  s.cards.filter((c) => rarityOf(s, c.templateId) === 'UR').map((c) => c.templateId),
).size;

const maxCardStars = (s: GameSnapshot) => s.cards.reduce((max, c) => Math.max(max, starsOf(c)), 0);
const maxCardLevel = (s: GameSnapshot) => s.cards.reduce((max, c) => Math.max(max, c.level), 0);
const maxCardMastery = (s: GameSnapshot) => s.cards.reduce((max, c) => Math.max(max, c.mastery), 0);

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

/** 教练组累计执教经验（存档 coachXp 与旧字段 xp 取较大值，与教练成长口径一致）。 */
const coachTotalXp = (s: GameSnapshot) =>
  (s.coaches ?? []).reduce((sum, c) => sum + ownedCoachXp(c, s.coachXp), 0);

/** 正式比赛总场次。 */
const matchesPlayed = (s: GameSnapshot) => s.club.wins + s.club.losses;

/** 带队赛季数：生涯赛季与俱乐部赛季取较大值（旧存档可能只有其中一个在推进）。 */
const seasonsLed = (s: GameSnapshot) => Math.max(s.career?.season ?? 1, s.club?.season ?? 1);

/** 实际打过正赛的档位数量（不要求夺冠）。 */
const playedTierCount = (s: GameSnapshot) => new Set(
  s.tournaments
    .filter((t) => t.matches.some((m) => m.winnerId !== null && (m.aId === t.playerTeamId || m.bId === t.playerTeamId)))
    .map((t) => t.tier),
).size;

/** 被保存下来的比赛里，10 分以上分差的胜场。 */
const blowoutWins = (s: GameSnapshot) =>
  s.matches.filter((m) => m.won && m.scoreFor - m.scoreAgainst >= 10).length;

/** 2 分以内分差的胜场（含加时）。 */
const tightWins = (s: GameSnapshot) =>
  s.matches.filter((m) => m.won && m.scoreFor - m.scoreAgainst <= 2).length;

/** 同名卡最多囤了几张。 */
const maxCopies = (s: GameSnapshot) => {
  const counts = new Map<string, number>();
  s.cards.forEach((c) => counts.set(c.templateId, (counts.get(c.templateId) ?? 0) + 1));
  return counts.size ? Math.max(...counts.values()) : 0;
};

/** 3 星以上的卡牌数量。 */
const starredCards = (s: GameSnapshot) => s.cards.filter((c) => starsOf(c) >= 3).length;

/** 收藏里数据层标注为已退役的选手卡（按模板去重）。 */
const retiredTemplates = (s: GameSnapshot) => new Set(
  s.cards
    .filter((c) => {
      const playerId = playerIdOf(s, c.templateId);
      return playerId ? Boolean(PLAYER_MAP[playerId]?.retired) : false;
    })
    .map((c) => c.templateId),
).size;

/** 已设置默认战术的地图数量（旧存档没有该字段时按空表处理）。 */
const tacticDefaultCount = (s: GameSnapshot) => Object.keys(s.tacticDefaults ?? {}).length;

/** 已购买侦查报告的对手数量（旧存档没有该字段时按空表处理）。 */
const scoutReportCount = (s: GameSnapshot) => Object.keys(s.scoutReports ?? {}).length;

/** 青训营里还在培养的新秀数量。 */
const academyCount = (s: GameSnapshot) => (s.prospects ?? []).filter((p) => p.status === 'academy').length;

/** 打完 10 场之后金币只剩 100 以内——彩蛋，找回弹性之前都算达成。 */
const brokeAfterTen = (s: GameSnapshot) => (s.club.coins <= 100 && matchesPlayed(s) >= 10 ? 1 : 0);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'win1', name: '首胜', nameEn: 'First Victory', desc: '赢下第一场正式比赛。', descEn: 'Win your first competitive match.', target: 1, reward: 500, category: 'career', value: (s) => s.club.wins },
  { id: 'win25', name: '磨合完成', nameEn: 'Fully Gelled', desc: '累计赢下 25 场比赛。', descEn: 'Win 25 matches in total.', target: 25, reward: 3000, category: 'career', value: (s) => s.club.wins },
  { id: 'win100', name: '老牌强队', nameEn: 'Established Powerhouse', desc: '累计赢下 100 场比赛。', descEn: 'Win 100 matches in total.', target: 100, reward: 12000, category: 'career', value: (s) => s.club.wins },
  { id: 'title1', name: '首个冠军', nameEn: 'First Trophy', desc: '赢下一届赛事的冠军。', descEn: 'Take home your first event title.', target: 1, reward: 4000, category: 'career', value: (s) => s.career.titles },
  { id: 'title5', name: '王朝开端', nameEn: 'Dynasty Begins', desc: '累计夺冠 5 次。', descEn: 'Win 5 championships in total.', target: 5, reward: 15000, category: 'career', value: (s) => s.career.titles },
  { id: 'tier6', name: '国际赛场', nameEn: 'International Stage', desc: '打进国际邀请赛。', descEn: 'Qualify for the International Invitational.', target: 6, reward: 6000, category: 'career', value: (s) => s.career.tier },
  { id: 'tier9', name: 'MAJOR 队伍', nameEn: 'MAJOR Team', desc: '打进 MAJOR。', descEn: 'Qualify for the MAJOR.', target: 9, reward: 12000, category: 'career', value: (s) => s.career.tier },
  { id: 'cards50', name: '收藏家', nameEn: 'Collector', desc: '拥有 50 名不同选手。', descEn: 'Own 50 different players.', target: 50, reward: 4000, category: 'collection', value: uniquePlayers },
  { id: 'cards150', name: '图鉴大师', nameEn: 'Catalog Master', desc: '拥有 150 名不同选手。', descEn: 'Own 150 different players.', target: 150, reward: 15000, category: 'collection', value: uniquePlayers },
  { id: 'stars10', name: '突破者', nameEn: 'Breakthrough', desc: '累计升星 10 次。', descEn: 'Star up cards 10 times.', target: 10, reward: 3000, category: 'collection', value: totalStars },
  { id: 'stars50', name: '全队五星', nameEn: 'Five-star squad', desc: '累计升星 50 次。', descEn: 'Star up cards 50 times.', target: 50, reward: 18000, category: 'collection', value: totalStars },
  { id: 'pulls100', name: '开包成瘾', nameEn: 'Pack Addict', desc: '累计开启 100 张卡。', descEn: 'Open 100 cards in total.', target: 100, reward: 5000, category: 'collection', value: (s) => s.pack.totalPulls },
  { id: 'train50', name: '魔鬼训练', nameEn: 'Boot Camp', desc: '累计完成 50 次训练。', descEn: 'Complete 50 training sessions.', target: 50, reward: 4000, category: 'collection', value: (s) => s.training.length + (s.club.level - 1) * 0 },
  { id: 'squad90', name: '顶尖阵容', nameEn: 'Elite Squad', desc: '俱乐部等级达到 10 级。', descEn: 'Reach club level 10.', target: 10, reward: 8000, category: 'career', value: (s) => s.club.level },

  // 生涯线
  { id: 'major1', name: 'MAJOR 首秀', nameEn: 'MAJOR Debut', desc: '在 MAJOR 正赛中打上第一场比赛。', descEn: 'Play your first MAJOR match.', target: 9, reward: 10000, category: 'career', value: bestPlayedTier },
  { id: 'majorChamp', name: 'MAJOR 冠军', nameEn: 'MAJOR Champion', desc: '捧起一座 MAJOR 冠军奖杯。', descEn: 'Win a MAJOR championship.', target: 1, reward: 25000, category: 'career', value: (s) => honorsOf(s).filter((h) => h.tier >= 9).length },
  { id: 'tierSweep', name: '十档通关', nameEn: 'Ten-tier Sweep', desc: '在全部 10 个档位的赛事中都拿到过冠军。', descEn: 'Win a championship at all 10 tiers.', target: 10, reward: 30000, category: 'career', value: clearedTiers },
  { id: 'unbeaten10', name: '十场不败', nameEn: 'Ten-match Unbeaten Run', desc: '连续 10 场比赛保持不败。', descEn: 'Go 10 matches without a loss.', target: 10, reward: 6000, category: 'career', value: unbeatenRun },

  // 收藏线
  { id: 'ur5', name: '巅峰收藏', nameEn: 'Peak Collection', desc: '集齐 5 张不同的 UR 卡。', descEn: 'Collect 5 different UR cards.', target: 5, reward: 20000, category: 'collection', value: uniqueUR },
  { id: 'star5', name: '五星卡', nameEn: 'Five-star Card', desc: '把一张卡牌升到 5 星。', descEn: 'Push a single card to 5 stars.', target: 5, reward: 9000, category: 'collection', value: maxCardStars },
  { id: 'level10', name: '十级卡', nameEn: 'Level 10 Card', desc: '把一张卡牌升到 10 级。', descEn: 'Level a single card up to level 10.', target: 10, reward: 7000, category: 'collection', value: maxCardLevel },
  { id: 'cards200', name: '图鉴 200', nameEn: 'Catalog 200', desc: '图鉴里收集 200 名不同选手。', descEn: 'Collect 200 different players in your catalog.', target: 200, reward: 20000, category: 'collection', value: uniquePlayers },

  // 教练线
  { id: 'coachS1', name: '传奇教头', nameEn: 'Legendary Coach', desc: '签下第一位 S 级教练。', descEn: 'Sign your first S-tier coach.', target: 1, reward: 8000, category: 'coach', value: sTierCoaches },
  { id: 'headCoach5', name: '主帅五级', nameEn: 'Head Coach Level 5', desc: '把主教练带到 5 级。', descEn: 'Raise your head coach to level 5.', target: 5, reward: 6000, category: 'coach', value: headCoachLevel },

  // ── 第二批 36 条：生涯（10）──
  { id: 'season3', name: '三季坚守', nameEn: 'Three Seasons In', desc: '带队打满 3 个赛季。', descEn: 'Lead the club through three seasons.', target: 3, reward: 3000, category: 'career', value: seasonsLed },
  { id: 'season5', name: '五年之约', nameEn: 'Five-year Pact', desc: '带队打满 5 个赛季。', descEn: 'Lead the club through five seasons.', target: 5, reward: 8000, category: 'career', value: seasonsLed },
  { id: 'title10', name: '十冠加身', nameEn: 'Ten Titles', desc: '累计夺冠 10 次。', descEn: 'Win 10 championships in total.', target: 10, reward: 20000, category: 'career', value: (s) => s.career.titles },
  { id: 'matches50', name: '五十场老手', nameEn: 'Fifty Matches Deep', desc: '累计打完 50 场正式比赛。', descEn: 'Play 50 competitive matches.', target: 50, reward: 5000, category: 'career', value: matchesPlayed },
  { id: 'matches200', name: '两百场生涯', nameEn: 'Two Hundred Matches', desc: '累计打完 200 场正式比赛。', descEn: 'Play 200 competitive matches.', target: 200, reward: 15000, category: 'career', value: matchesPlayed },
  { id: 'events10', name: '十站征战', nameEn: 'Ten Events', desc: '打完 10 站赛事。', descEn: 'Finish 10 events.', target: 10, reward: 6000, category: 'career', value: (s) => s.career.completedTournaments },
  { id: 'tiersPlayed10', name: '档位巡礼', nameEn: 'Circuit Tour', desc: '在全部 10 个档位的赛事中都上过场（不要求夺冠）。', descEn: 'Play at least one match at all 10 tiers.', target: 10, reward: 25000, category: 'career', value: playedTierCount },
  { id: 'streak15', name: '十五连胜', nameEn: 'Fifteen-game Streak', desc: '连续赢下 15 场比赛。', descEn: 'Win 15 matches in a row.', target: 15, reward: 12000, category: 'career', value: unbeatenRun },
  { id: 'blowout5', name: '碾压五场', nameEn: 'Five Blowouts', desc: '以 10 分以上分差赢下 5 场比赛。', descEn: 'Win five matches by 10 rounds or more.', target: 5, reward: 6000, category: 'career', value: blowoutWins },
  { id: 'tight10', name: '死斗十场', nameEn: 'Ten Nail-biters', desc: '以 2 分以内的分差赢下 10 场比赛。', descEn: 'Win ten matches by two rounds or fewer.', target: 10, reward: 7000, category: 'career', value: tightWins },

  // ── 收藏（10）──
  { id: 'cards250', name: '图鉴 250', nameEn: 'Catalog 250', desc: '图鉴里收集 250 名不同选手。', descEn: 'Collect 250 different players in your catalog.', target: 250, reward: 25000, category: 'collection', value: uniquePlayers },
  { id: 'cards300', name: '图鉴全满', nameEn: 'Full Catalog', desc: '图鉴里收集 300 名不同选手。', descEn: 'Collect 300 different players in your catalog.', target: 300, reward: 30000, category: 'collection', value: uniquePlayers },
  { id: 'ur10', name: '十张巅峰', nameEn: 'Ten Ultimates', desc: '集齐 10 张不同的 UR 卡。', descEn: 'Collect 10 different UR cards.', target: 10, reward: 28000, category: 'collection', value: uniqueUR },
  { id: 'star10', name: '十星之路', nameEn: 'Ten-star Road', desc: '把一张卡牌升到 10 星。', descEn: 'Push a single card to 10 stars.', target: 10, reward: 15000, category: 'collection', value: maxCardStars },
  { id: 'level30', name: '满级卡牌', nameEn: 'Maxed Card', desc: '把一张卡牌练到 30 级。', descEn: 'Level a single card up to level 30.', target: 30, reward: 20000, category: 'collection', value: maxCardLevel },
  { id: 'pulls500', name: '开包五百', nameEn: 'Five Hundred Pulls', desc: '累计开启 500 张卡。', descEn: 'Open 500 cards in total.', target: 500, reward: 8000, category: 'collection', value: (s) => s.pack.totalPulls },
  { id: 'pulls1000', name: '开包一千', nameEn: 'One Thousand Pulls', desc: '累计开启 1000 张卡。', descEn: 'Open 1000 cards in total.', target: 1000, reward: 18000, category: 'collection', value: (s) => s.pack.totalPulls },
  { id: 'mastery90', name: '精通九十', nameEn: 'Mastery 90', desc: '把一张卡牌的精通练到 90。', descEn: 'Raise a single card mastery to 90.', target: 90, reward: 10000, category: 'collection', value: maxCardMastery },
  { id: 'copies9', name: '同名九张', nameEn: 'Nine Copies', desc: '同一名选手囤到 9 张卡。', descEn: 'Hold nine copies of one player.', target: 9, reward: 6000, category: 'collection', value: maxCopies },
  { id: 'starred5', name: '五张三星', nameEn: 'Five Three-star Cards', desc: '拥有 5 张 3 星以上的卡牌。', descEn: 'Own five cards at three stars or more.', target: 5, reward: 12000, category: 'collection', value: starredCards },

  // ── 教练（6）──
  { id: 'coachS3', name: '三 S 教头', nameEn: 'Three S-tier Coaches', desc: '拥有 3 位 S 级教练。', descEn: 'Own three S-tier coaches.', target: 3, reward: 20000, category: 'coach', value: sTierCoaches },
  { id: 'coachS5', name: '五 S 教头', nameEn: 'Five S-tier Coaches', desc: '拥有 5 位 S 级教练。', descEn: 'Own five S-tier coaches.', target: 5, reward: 30000, category: 'coach', value: sTierCoaches },
  { id: 'headCoach10', name: '主帅十级', nameEn: 'Head Coach Level 10', desc: '把主教练带到 10 级。', descEn: 'Raise your head coach to level 10.', target: 10, reward: 15000, category: 'coach', value: headCoachLevel },
  { id: 'coaches10', name: '教练组十人', nameEn: 'Staff of Ten', desc: '教练组里拥有 10 位教练。', descEn: 'Own ten coaches on the staff.', target: 10, reward: 5000, category: 'coach', value: (s) => (s.coaches ?? []).length },
  { id: 'coaches20', name: '教练组二十人', nameEn: 'Staff of Twenty', desc: '教练组里拥有 20 位教练。', descEn: 'Own twenty coaches on the staff.', target: 20, reward: 12000, category: 'coach', value: (s) => (s.coaches ?? []).length },
  { id: 'coachXp1000', name: '千点执教', nameEn: 'A Thousand Coaching XP', desc: '教练组累计执教经验达到 1000。', descEn: 'Reach 1000 total coaching XP.', target: 1000, reward: 8000, category: 'coach', value: coachTotalXp },

  // ── 战术（5）──
  { id: 'tacticDocs3', name: '战术板三图', nameEn: 'Three Maps Scripted', desc: '为 3 张地图设置默认战术。', descEn: 'Set a default tactic on three maps.', target: 3, reward: 4000, category: 'tactic', value: tacticDefaultCount },
  { id: 'tacticDocs7', name: '全图战术板', nameEn: 'Full Map Script', desc: '为全部 7 张地图设置默认战术。', descEn: 'Set a default tactic on all seven maps.', target: 7, reward: 12000, category: 'tactic', value: tacticDefaultCount },
  { id: 'scout5', name: '情报五家', nameEn: 'Five Dossiers', desc: '为 5 支对手战队购买侦查报告。', descEn: 'Buy scout reports on five opponents.', target: 5, reward: 5000, category: 'tactic', value: scoutReportCount },
  { id: 'synergy70', name: '默契七十', nameEn: 'Chemistry 70', desc: '把团队默契养到 70。', descEn: 'Raise team chemistry to 70.', target: 70, reward: 8000, category: 'tactic', value: (s) => Math.round(s.squad.synergy) },
  { id: 'together50', name: '共同作战五十场', nameEn: 'Fifty Together', desc: '这套首发一起打完 50 场比赛。', descEn: 'Play 50 matches with the same starting five.', target: 50, reward: 6000, category: 'tactic', value: (s) => s.squad.matchesTogether },

  // ── 彩蛋（5）──
  { id: 'coins100k', name: '存钱罐', nameEn: 'Piggy Bank', desc: '手上同时握着 100,000 金币。', descEn: 'Hold 100,000 coins at once.', target: 100000, reward: 10000, category: 'easter', value: (s) => s.club.coins },
  { id: 'badgeSet', name: '换个门面', nameEn: 'New Crest', desc: '给俱乐部换上一枚徽章。', descEn: 'Pick a crest for your club.', target: 1, reward: 1500, category: 'easter', value: (s) => (s.club.badge ? 1 : 0) },
  { id: 'retiredLegend', name: '传奇终章', nameEn: 'Legendary Epilogue', desc: '收藏一名数据层已标注退役的选手卡。', descEn: 'Own a card of a player the data layer marks as retired.', target: 1, reward: 3000, category: 'easter', value: retiredTemplates },
  { id: 'academyFull', name: '青训满员', nameEn: 'Academy Full House', desc: '青训营同时养满 8 名新秀。', descEn: 'Keep eight prospects in the academy at once.', target: 8, reward: 3000, category: 'easter', value: academyCount },
  { id: 'emptyPockets', name: '囊中羞涩', nameEn: 'Short on Cash', desc: '打完 10 场之后，金币只剩 100 以内。', descEn: 'End up with 100 coins or less after ten matches.', target: 1, reward: 1000, category: 'easter', value: brokeAfterTen },
];
