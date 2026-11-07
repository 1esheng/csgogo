/**
 * 支柱三「长期目标」的英文词条：成就分类、王朝里程碑、名人堂、收藏册与生涯结局。
 * 结构与 areas/veto.ts 一致：命中本区词条就用英文，其余交给全局 tr() 回退。
 */
import { getLang, tr } from '@/i18n';

export const PHRASES: { zh: string; en: string }[] = [
  // —— 成就页分类 ——
  { zh: '长期目标', en: 'Long-term goals' },
  { zh: '成就', en: 'Achievements' },
  { zh: '分类', en: 'Category' },
  { zh: '生涯', en: 'Career' },
  { zh: '收藏', en: 'Collection' },
  { zh: '教练', en: 'Coaching' },
  { zh: '战术', en: 'Tactics' },
  { zh: '彩蛋', en: 'Easter eggs' },
  { zh: '里程碑', en: 'Milestones' },

  // —— 王朝里程碑 ——
  { zh: '王朝里程碑', en: 'Dynasty milestones' },
  { zh: '跨赛季的长期目标，达成后一次性领取金币。', en: 'Multi-season goals that pay out coins once when reached.' },
  { zh: '达成里程碑', en: 'Milestones reached' },
  { zh: '可领取奖励', en: 'Claimable rewards' },
  { zh: '累计已领', en: 'Coins claimed' },
  { zh: '里程碑还没达成。', en: 'Milestone not reached yet.' },
  { zh: '没有这个记录。', en: 'No such record.' },
  { zh: '未达成', en: 'Not reached' },
  { zh: '已经领取过了。', en: 'Already claimed.' },

  // —— 名人堂 ——
  { zh: '名人堂', en: 'Hall of fame' },
  { zh: '收录口径', en: 'Inclusion criteria' },
  { zh: '退役名将', en: 'Retired legends' },
  { zh: '历史首发', en: 'Former starters' },
  { zh: '已离任教练', en: 'Former coaches' },
  { zh: '已解约新秀', en: 'Released prospects' },
  { zh: '进过首发的场次', en: 'Starts on record' },
  { zh: '最近出场', en: 'Last appearance' },
  { zh: '名人堂还是空的', en: 'The hall of fame is empty' },
  {
    zh: '口径：本存档没有「退役事件」，所以名人堂收录 ①数据层标注为已退役、且你收藏过的选手；②在已保存的比赛首发记录里出现过、但现在不在首发的选手；③已离任的教练与已解约的青训。',
    en: 'Criteria: this save has no retirement events, so the hall lists (1) players your collection holds whose data layer marks them retired, (2) players who appear in a saved match lineup but are no longer starters, and (3) coaches who left office and prospects you released.',
  },

  // —— 收藏册 ——
  { zh: '收藏册', en: 'Card albums' },
  { zh: '按战队与国籍自动成册', en: 'Auto-built from team and nationality' },
  { zh: '战队册', en: 'Team albums' },
  { zh: '国籍册', en: 'Nation albums' },
  { zh: '已集齐', en: 'Complete' },
  { zh: '未集齐', en: 'Incomplete' },
  { zh: '集齐奖励', en: 'Album bonus' },
  { zh: '永久加成', en: 'Permanent bonus' },
  { zh: '收藏册还是空的', en: 'No albums yet' },
  { zh: '缺少', en: 'Missing' },
  { zh: '每集齐一册：阵容默契 +0.5 点（上限 +8 点），直接加到阵容评分使用的默契值上。', en: 'Each completed album adds +0.5 chemistry points (cap +8), fed straight into the chemistry value the squad rating already uses.' },

  // —— 生涯结局 ——
  { zh: '生涯结局', en: 'Career endings' },
  { zh: ' 个结局', en: ' endings' },
  { zh: '破产清算', en: 'Bankrupt' },
  { zh: '王朝加冕', en: 'Dynasty crowned' },
  { zh: '大满贯', en: 'Grand slam' },
  { zh: '传奇生涯', en: 'Legendary career' },
  { zh: '记入档案', en: 'Add to the record' },
  { zh: '已写入生涯档案', en: 'Written to your career record' },
  { zh: '继续游戏', en: 'Keep playing' },
  { zh: '结局只是展示与一次性结算文案，不会中断游戏循环。', en: 'Endings are presentation and a one-off record only — the game loop keeps running.' },

  // —— 零散片段 ——
  { zh: ' 个可领取', en: ' claimable' },
  { zh: ' 名', en: ' people' },
  { zh: '执教经验', en: 'Coaching XP' },
  { zh: '本册池内的卡牌', en: 'Cards in these albums' },
  { zh: '还没收集到的卡牌', en: 'Cards still missing' },
  { zh: '打几场正式比赛、或者收藏一位已退役的传奇，这里就会有人。', en: 'Play a few matches, or collect a retired legend, and someone will show up here.' },
  { zh: '开几个卡包，战队册和国籍册会随收藏自动出现。', en: 'Open a few packs — team and nation albums appear as your collection grows.' },
];

const MAP = new Map(PHRASES.map((p) => [p.zh, p.en]));

/** 支柱三取词：命中本区词条就用英文，其余交给全局 tr()。 */
export function trP3(zh: string): string {
  const en = MAP.get(zh);
  if (en === undefined) return tr(zh);
  if (getLang() !== 'en') return zh;
  return en.replace(/（/g, ' (').replace(/）/g, ')').replace(/。/g, '.');
}
