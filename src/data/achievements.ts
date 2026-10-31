import type { GameSnapshot } from '@/types';
import { starsOf } from '@/types';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  target: number;
  reward: number;
  value: (s: GameSnapshot) => number;
}

const totalStars = (s: GameSnapshot) => s.cards.reduce((sum, c) => sum + (starsOf(c) - 1), 0);
const uniquePlayers = (s: GameSnapshot) => new Set(s.cards.map((c) => c.templateId)).size;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'win1', name: '首胜', desc: '赢下第一场正式比赛。', target: 1, reward: 500, value: (s) => s.club.wins },
  { id: 'win25', name: '磨合完成', desc: '累计赢下 25 场比赛。', target: 25, reward: 3000, value: (s) => s.club.wins },
  { id: 'win100', name: '老牌强队', desc: '累计赢下 100 场比赛。', target: 100, reward: 12000, value: (s) => s.club.wins },
  { id: 'title1', name: '首个冠军', desc: '赢下一届赛事的冠军。', target: 1, reward: 4000, value: (s) => s.career.titles },
  { id: 'title5', name: '王朝开端', desc: '累计夺冠 5 次。', target: 5, reward: 15000, value: (s) => s.career.titles },
  { id: 'tier6', name: '国际赛场', desc: '打进国际邀请赛。', target: 6, reward: 6000, value: (s) => s.career.tier },
  { id: 'tier9', name: 'MAJOR 队伍', desc: '打进 MAJOR。', target: 9, reward: 12000, value: (s) => s.career.tier },
  { id: 'cards50', name: '收藏家', desc: '拥有 50 名不同选手。', target: 50, reward: 4000, value: uniquePlayers },
  { id: 'cards150', name: '图鉴大师', desc: '拥有 150 名不同选手。', target: 150, reward: 15000, value: uniquePlayers },
  { id: 'stars10', name: '突破者', desc: '累计升星 10 次。', target: 10, reward: 3000, value: totalStars },
  { id: 'stars50', name: '全队五星', desc: '累计升星 50 次。', target: 50, reward: 18000, value: totalStars },
  { id: 'pulls100', name: '开包成瘾', desc: '累计开启 100 张卡。', target: 100, reward: 5000, value: (s) => s.pack.totalPulls },
  { id: 'train50', name: '魔鬼训练', desc: '累计完成 50 次训练。', target: 50, reward: 4000, value: (s) => s.training.length + (s.club.level - 1) * 0 },
  { id: 'squad90', name: '顶尖阵容', desc: '俱乐部等级达到 10 级。', target: 10, reward: 8000, value: (s) => s.club.level },
];