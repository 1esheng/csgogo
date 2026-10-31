import type { MapId } from '@/types';

/** 已知战队的教练（公开资料），用于战队详情页。 */
export const TEAM_COACH: Record<string, string> = {
  navi: "Andrey 'B1ad3' Gorodenskiy",
  vitality: "Rémy 'XTQZZZ' Quoniam",
  spirit: "Sergey 'hally' Shavaev",
  mouz: "Dennis 'sycrone' Nielsen",
  faze: "Robert 'RobbaN' Dahlström",
  g2: "Wiktor 'TaZ' Wojtas",
  falcons: "Danny 'zonic' Sørensen",
  furia: "Nicholas 'guerri' Nogueira",
  astralis: "Casper 'ruggah' Due",
  heroic: "Emil 'mezii' Madsen（代理）",
  complexity: "Tiaan 'T.c' Coertzen",
  virtuspro: "Dastan 'dastan' Akbayev",
  liquid: "Jan 'Jame' Ali（代理）",
  ence: "Ville 'fabben' Ikonen",
  big: "Fatih 'gob b' Dayik",
  fnatic: "Jamie 'keita' Hall",
  nip: "Björn 'THREAT' Pers",
  pain: "Henrique 'rikz' Waku",
  imperial: "Rafael 'zakk' Fernandes",
  mibr: "Wilthon 'zock' Silva",
  mongolz: "Byambasuren 'maaRaa' Batbayar",
  tyloo: "Liu 'Kaze' Chenghao（代理）",
};

/** 战队地区（用于详情页的国旗/地区标签）。 */
export const TEAM_REGION: Record<string, string> = {
  navi: '独联体', vitality: '欧洲', spirit: '独联体', mouz: '欧洲', faze: '国际', g2: '国际',
  falcons: '中东', furia: '巴西', astralis: '丹麦', heroic: '丹麦', complexity: '北美', virtuspro: '独联体',
  liquid: '北美', ence: '芬兰', big: '德国', fnatic: '欧洲', nip: '瑞典', pain: '巴西',
  imperial: '巴西', mibr: '巴西', mongolz: '蒙古', tyloo: '中国', betboom: '独联体', gamerlegion: '欧洲',
};

export const MAP_POOL: MapId[] = ['Mirage', 'Inferno', 'Nuke'];