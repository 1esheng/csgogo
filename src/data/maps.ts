import type { MapId, MapSpec } from '@/types';

export const MAPS: Record<MapId, MapSpec> = {
  Mirage: {
    id: 'Mirage',
    name: 'Mirage',
    tagline: '中路控制、窗户对狙，永恒的 pug 路线',
    tBias: 0.4,
    ctBias: 0.2,
    awpFactor: 1.1,
    midValue: 82,
    tempo: 1.05,
    sites: {
      A: { name: 'A 点（Palace / CT）', tDifficulty: 0.52, ctAdvantage: 0.16, note: '交火口狭窄，CT 的交叉火力非常强。' },
      B: { name: 'B 点（Apps / Bench）', tDifficulty: 0.46, ctAdvantage: 0.1, note: '短 Apps 路线让快攻更容易成型。' },
    },
    description: '均衡地图：拿下中路就能同时威胁两个点位。适合狙击的对枪视野让窗户单挑成为胜负手。',
  },
  Inferno: {
    id: 'Inferno',
    name: 'Inferno',
    tagline: '香蕉道控制、道具对轰、残酷回防',
    tBias: -0.3,
    ctBias: 0.55,
    awpFactor: 0.92,
    midValue: 68,
    tempo: 0.9,
    sites: {
      A: { name: 'A 点（Pit / Short）', tDifficulty: 0.6, ctAdvantage: 0.22, note: '重道具的进攻位；回防更利于 CT。' },
      B: { name: 'B 点（Banana / Triple）', tDifficulty: 0.57, ctAdvantage: 0.2, note: '香蕉道是一场消耗战与燃烧弹的较量。' },
    },
    description: '道具地图。烟与火决定回合走向；近身距离削弱了狙击的统治力。',
  },
  Nuke: {
    id: 'Nuke',
    name: 'Nuke',
    tagline: '立体攻防，上下层心理战',
    tBias: 0.8,
    ctBias: 0.9,
    awpFactor: 1.18,
    midValue: 74,
    tempo: 0.86,
    sites: {
      A: { name: 'A 点（Upper）', tDifficulty: 0.48, ctAdvantage: 0.18, note: '控住 Outside 就能快速打 A。' },
      B: { name: 'B 点（Lower）', tDifficulty: 0.62, ctAdvantage: 0.26, note: 'Ramp 与 Vent 会惩罚粗糙的轮转。' },
    },
    description: '密集轮转与立体道具。双方都能从完美信息里拿到巨大优势。',
  },
  Ancient: {
    id: 'Ancient',
    name: 'Ancient',
    tagline: '丛林地形，中路与 A 洞的拉锯',
    tBias: 0.1,
    ctBias: 0.45,
    awpFactor: 0.95,
    midValue: 76,
    tempo: 0.94,
    sites: {
      A: { name: 'A 点（Donut / Cave）', tDifficulty: 0.55, ctAdvantage: 0.18, note: '洞口狭窄，道具与闪光决定成败。' },
      B: { name: 'B 点（Ramp / Cave）', tDifficulty: 0.5, ctAdvantage: 0.14, note: 'B 斜坡是最常见的突破口。' },
    },
    description: '重道具的热带地图：闪光与烟的衔接比个人枪法更重要。',
  },
  Anubis: {
    id: 'Anubis',
    name: 'Anubis',
    tagline: '水路与中路双线，T 侧进攻空间充足',
    tBias: 0.55,
    ctBias: 0.1,
    awpFactor: 0.98,
    midValue: 84,
    tempo: 1.08,
    sites: {
      A: { name: 'A 点（Palace / Heaven）', tDifficulty: 0.44, ctAdvantage: 0.12, note: 'T 侧可以从中路与 Palace 夹 A。' },
      B: { name: 'B 点（Water / Connector）', tDifficulty: 0.48, ctAdvantage: 0.16, note: '水路的烟与火是攻防关键。' },
    },
    description: '偏进攻的地图：中路控制后可以快速转移，回防距离长。',
  },
  Dust2: {
    id: 'Dust2',
    name: 'Dust2',
    tagline: '长廊对狙，经典中的经典',
    tBias: 0.35,
    ctBias: 0.25,
    awpFactor: 1.22,
    midValue: 88,
    tempo: 1.02,
    sites: {
      A: { name: 'A 点（Long / Short）', tDifficulty: 0.5, ctAdvantage: 0.15, note: '长 A 的狙击对枪决定节奏。' },
      B: { name: 'B 点（Tunnels / Window）', tDifficulty: 0.47, ctAdvantage: 0.12, note: '洞口压制能强行打开 B 点。' },
    },
    description: '远古沙漠地图：中路与长廊的狙击视野极其开阔，AWP 价值最高。',
  },
  Train: {
    id: 'Train',
    name: 'Train',
    tagline: '车厢顶与 Ivy，道具与站位的博弈',
    tBias: -0.1,
    ctBias: 0.5,
    awpFactor: 1.05,
    midValue: 70,
    tempo: 0.88,
    sites: {
      A: { name: 'A 点（Ivy / Z）', tDifficulty: 0.58, ctAdvantage: 0.2, note: 'Ivy 的狭窄通道让道具战决定成败。' },
      B: { name: 'B 点（Popdog / Upper）', tDifficulty: 0.54, ctAdvantage: 0.17, note: '车厢顶的控制权直接决定 B 点归属。' },
    },
    description: '偏防守的地图：车厢顶与高地视野让 CT 站位非常强势。',
  },
};

export const MAP_LIST: MapSpec[] = Object.values(MAPS);

export function mapLabel(id: MapId): string {
  return MAPS[id]?.name ?? id;
}