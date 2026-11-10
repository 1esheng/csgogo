export type CoachStyle = '战术' | '执教纪律' | '培养' | '临场';

export interface CoachIdentity {
  id: string;
  nickname: string;
  realName: string;
  country: string;
  countryCode: string;
  age: number;
  /** 执教能力 60-99，决定教练排名与加成。 */
  ability: number;
  style: CoachStyle;
  /** 曾/现任战队 id（对应 AI 战队），无则空。 */
  teamId?: string;
  bio: string;
}

export const COACHES: CoachIdentity[] = [  { id: 'b1ad3', nickname: 'B1ad3', realName: "Andrey Gorodenskiy", country: '乌克兰', countryCode: 'UA', age: 38, ability: 97, style: '战术', teamId: 'navi', bio: 'NAVI 王朝的战术设计师，体系与青训并重。' },
  { id: 'zonic', nickname: 'zonic', realName: "Danny Sørensen", country: '丹麦', countryCode: 'DK', age: 39, ability: 96, style: '执教纪律', teamId: 'falcons', bio: '五届 Major 冠军教练，纪律与细节的化身。' },
  { id: 'xtqzzz', nickname: 'XTQZZZ', realName: "Rémy Quoniam", country: '法国', countryCode: 'FR', age: 36, ability: 93, style: '临场', teamId: 'vitality', bio: '法国体系派代表，临场调整极快。' },
  { id: 'hally', nickname: 'hally', realName: "Sergey Shavaev", country: '俄罗斯', countryCode: 'RU', age: 33, ability: 92, style: '战术', teamId: 'spirit', bio: '把 Spirit 带成世界第一的分析型教练。' },
  { id: 'sycrone', nickname: 'sycrone', realName: "Dennis Nielsen", country: '丹麦', countryCode: 'DK', age: 33, ability: 90, style: '培养', teamId: 'mouz', bio: 'MOUZ 青训工厂的操盘手，擅长培养新人。' },
  { id: 'taz', nickname: 'TaZ', realName: "Wiktor Wojtas", country: '波兰', countryCode: 'PL', age: 38, ability: 89, style: '临场', teamId: 'g2', bio: '从传奇选手转型的激情型教练。' },
  { id: 'robban', nickname: 'RobbaN', realName: "Robert Dahlström", country: '瑞典', countryCode: 'SE', age: 38, ability: 88, style: '执教纪律', teamId: 'faze', bio: 'FaZe 的老大哥，管理巨星阵容的高手。' },
  { id: 'guerri', nickname: 'guerri', realName: "Nicholas Nogueira", country: '巴西', countryCode: 'BR', age: 38, ability: 87, style: '临场', teamId: 'furia', bio: '巴西激进风格的总设计师。' },
  { id: 'ruggah', nickname: 'ruggah', realName: "Casper Due", country: '丹麦', countryCode: 'DK', age: 33, ability: 86, style: '战术', teamId: 'astralis', bio: 'Astralis 体系的继承者。' },
  { id: 'gobb', nickname: 'gob b', realName: "Fatih Dayik", country: '德国', countryCode: 'DE', age: 39, ability: 85, style: '执教纪律', teamId: 'big', bio: '德国 CS 的教父级人物。' },
  { id: 'kassad', nickname: 'kassad', realName: "Aleksandar Trifunović", country: '塞尔维亚', countryCode: 'RS', age: 37, ability: 85, style: '战术', bio: '巴尔干体系的战术教练，曾带出多支黑马。' },
  { id: 'peacemaker', nickname: 'peacemaker', realName: "Luis Tadeu", country: '巴西', countryCode: 'BR', age: 38, ability: 84, style: '战术', bio: '巴西留洋派教练，欧洲体系与南美风格的桥梁。' },
  { id: 'starix', nickname: 'starix', realName: "Sergey Ischuk", country: '乌克兰', countryCode: 'UA', age: 37, ability: 84, style: '战术', bio: 'NAVI 早期的大脑，狙击手出身。' },
  { id: 'kane', nickname: 'Kane', realName: "Mykhailo Blahin", country: '乌克兰', countryCode: 'UA', age: 36, ability: 83, style: '执教纪律', bio: '乌克兰体系教练，长期在独联体执教。' },
  { id: 'lmbt', nickname: 'lmbt', realName: "Sergey Bezhanov", country: '乌克兰', countryCode: 'UA', age: 37, ability: 83, style: '培养', bio: '擅长带年轻阵容的独联体教练。' },
  { id: 'zoner', nickname: 'zoneR', realName: "Aleksandr Bogatiryev", country: '俄罗斯', countryCode: 'RU', age: 35, ability: 82, style: '执教纪律', bio: '俄罗斯老派教练，训练强度极高。' },
  { id: 'hooch', nickname: 'hooch', realName: "Dmitry Bogdanov", country: '俄罗斯', countryCode: 'RU', age: 38, ability: 82, style: '临场', bio: '从选手转型的俄罗斯教练。' },
  { id: 'def', nickname: 'def', realName: "Andrey Ivlev", country: '俄罗斯', countryCode: 'RU', age: 34, ability: 81, style: '战术', bio: '独联体新生代教练，数据分析见长。' },
  { id: 'neil', nickname: 'NeiL_M', realName: "NeiL Moreira", country: '巴西', countryCode: 'BR', age: 35, ability: 81, style: '培养', bio: '巴西青训教练，擅长打磨新人。' },
  { id: 'zakk', nickname: 'zakk', realName: "Rafael Fernandes", country: '巴西', countryCode: 'BR', age: 40, ability: 80, style: '执教纪律', teamId: 'imperial', bio: 'Imperial 的老派教头。' },
  { id: 'zock', nickname: 'zock', realName: "Wilthon Silva", country: '巴西', countryCode: 'BR', age: 37, ability: 80, style: '临场', teamId: 'mibr', bio: 'MIBR 的临场指挥型教练。' },
  { id: 'rikz', nickname: 'rikz', realName: "Henrique Waku", country: '巴西', countryCode: 'BR', age: 32, ability: 79, style: '战术', teamId: 'pain', bio: 'paiN 的分析型教练。' },
  { id: 'dead', nickname: 'dead', realName: "Gabriel Lima", country: '巴西', countryCode: 'BR', age: 33, ability: 79, style: '培养', bio: '巴西体系教练，擅长带青年队。' },
  { id: 'cogu', nickname: 'cogu', realName: "Raphael Camargo", country: '巴西', countryCode: 'BR', age: 36, ability: 78, style: '执教纪律', bio: '巴西元老级教练。' },
  { id: 'nak', nickname: 'nak', realName: "Renato Nakano", country: '巴西', countryCode: 'BR', age: 36, ability: 78, style: '战术', bio: '巴西战术派教练。' },
  { id: 'apoka', nickname: 'Apoka', realName: "Alexandre Zamberlan", country: '巴西', countryCode: 'BR', age: 34, ability: 77, style: '培养', bio: '巴西新生代教练。' },
  { id: 'zews', nickname: 'zews', realName: "Wilton Prado", country: '巴西', countryCode: 'BR', age: 37, ability: 84, style: '战术', bio: '两届 Major 冠军教练，体系功底深厚。' },
  { id: 'moses', nickname: 'moses', realName: "Jason O'Toole", country: '美国', countryCode: 'US', age: 37, ability: 82, style: '战术', bio: '北美著名教练与分析师。' },
  { id: 'daps', nickname: 'daps', realName: "Damian Steele", country: '美国', countryCode: 'US', age: 31, ability: 80, style: '执教纪律', teamId: 'nrg', bio: '从指挥转型的北美教练。' },
  { id: 'elmapuddy', nickname: 'Elmapuddy', realName: "Chris Tebbit", country: '澳大利亚', countryCode: 'AU', age: 33, ability: 80, style: '战术', bio: '澳洲数据分析型教练。' },
  { id: 'spunJ', nickname: 'SPUNJ', realName: "Chad Burchill", country: '澳大利亚', countryCode: 'AU', age: 34, ability: 76, style: '临场', bio: '从解说转型的澳洲教练。' },
  { id: 'keita', nickname: 'keita', realName: "Jamie Hall", country: '英国', countryCode: 'GB', age: 34, ability: 79, style: '战术', teamId: 'fnatic', bio: 'fnatic 的英国教练，体系重建者。' },
  { id: 'threat', nickname: 'THREAT', realName: "Björn Pers", country: '瑞典', countryCode: 'SE', age: 41, ability: 83, style: '战术', teamId: 'nip', bio: 'NIP 的元老教练，体系经验丰富。' },
  { id: 'pita', nickname: 'pita', realName: "Faruk Pita", country: '瑞典', countryCode: 'SE', age: 36, ability: 80, style: '执教纪律', bio: '瑞典体系教练，长期执教顶级队。' },
  { id: 'ave', nickname: 'Ave', realName: "Adam Friberg", country: '瑞典', countryCode: 'SE', age: 34, ability: 76, style: '培养', bio: '从选手转型的瑞典教练。' },
  { id: 'jumpy', nickname: 'Jumpy', realName: "Jimmy Bergman", country: '瑞典', countryCode: 'SE', age: 33, ability: 75, style: '临场', teamId: 'sangal', bio: '瑞典新生代教练。' },
  { id: 'xizt', nickname: 'Xizt', realName: "Richard Landström", country: '瑞典', countryCode: 'SE', age: 34, ability: 78, style: '战术', teamId: 'nip', bio: 'NIP 王朝队长出身的教练。' },
  { id: 'trace', nickname: 'trace', realName: "Martin Heldt", country: '丹麦', countryCode: 'DK', age: 34, ability: 79, style: '战术', bio: '丹麦分析型教练。' },
  { id: 'vuggo', nickname: 'vuggo', realName: "Vuggo", country: '丹麦', countryCode: 'DK', age: 33, ability: 75, style: '执教纪律', bio: '丹麦体系教练。' },
  { id: 'acilion', nickname: 'AcilioN', realName: "Asger Larsen", country: '丹麦', countryCode: 'DK', age: 29, ability: 76, style: '临场', bio: '丹麦年轻教练。' },
  { id: 'saw', nickname: 'sAw', realName: "Nicolai Reedtz", country: '丹麦', countryCode: 'DK', age: 35, ability: 78, style: '培养', teamId: 'g2', bio: '丹麦青训教练。' },
  { id: 'enkay', nickname: 'enkay J', realName: "Jan Krummrey", country: '德国', countryCode: 'DE', age: 33, ability: 78, style: '战术', teamId: 'faze', bio: '德国体系教练。' },
  { id: 'legija', nickname: 'LEGIJA', realName: "Tizian Feldbusch", country: '德国', countryCode: 'DE', age: 31, ability: 77, style: '执教纪律', bio: '从选手转型的德国教练。' },
  { id: 'kuben', nickname: 'kuben', realName: "Jakub Gurczyński", country: '波兰', countryCode: 'PL', age: 37, ability: 82, style: '战术', bio: '波兰黄金一代的教练。' },
  { id: 'neo', nickname: 'NEO', realName: "Filip Kubski", country: '波兰', countryCode: 'PL', age: 38, ability: 84, style: '临场', teamId: 'astralis', bio: '从传奇队长转型的教练。' },
  { id: 'loord', nickname: 'Loord', realName: "Mariusz Cybulski", country: '波兰', countryCode: 'PL', age: 37, ability: 76, style: '执教纪律', bio: '波兰体系教练。' },
  { id: 'ynk', nickname: 'YNk', realName: "Janko Paunović", country: '塞尔维亚', countryCode: 'RS', age: 35, ability: 79, style: '战术', bio: '巴尔干著名分析师与教练。' },
  { id: 'neptune', nickname: 'Neptune', realName: "Aleksandar Bjegović", country: '塞尔维亚', countryCode: 'RS', age: 31, ability: 74, style: '培养', bio: '巴尔干新生代教练。' },
  { id: 'maaRaa', nickname: 'maaRaa', realName: "Byambasuren Batbayar", country: '蒙古', countryCode: 'MN', age: 30, ability: 81, style: '战术', teamId: 'mongolz', bio: '把蒙古 CS 带上世界舞台的教练。' },
  { id: 'dade', nickname: 'dade', realName: "Dade", country: '蒙古', countryCode: 'MN', age: 28, ability: 72, style: '培养', bio: '蒙古青年队教练。' },
  { id: 'cheng', nickname: 'Cheng', realName: "Cheng Wei", country: '中国', countryCode: 'CN', age: 35, ability: 78, style: '战术', teamId: 'tyloo', bio: '天禄体系教练，亚洲赛场经验丰富。' },
  { id: 'zhu', nickname: 'zhu', realName: "Zhu Jiacheng", country: '中国', countryCode: 'CN', age: 30, ability: 76, style: '执教纪律', bio: '中国体系教练。' },
  { id: 'liu', nickname: 'Liu', realName: "Liu Kun", country: '中国', countryCode: 'CN', age: 33, ability: 74, style: '培养', bio: '中国青训教练。' },
  { id: 'yue', nickname: 'Yue', realName: "Yue Hao", country: '中国', countryCode: 'CN', age: 31, ability: 72, style: '临场', bio: '中国新生代教练。' },
  { id: 'huntercoach', nickname: 'Hunter', realName: "Hunter Liu", country: '中国', countryCode: 'CN', age: 29, ability: 71, style: '战术', bio: '中国数据分析型教练。' },
  { id: 'mTwcoach', nickname: 'mTw', realName: "Morten Thomsen", country: '丹麦', countryCode: 'DK', age: 36, ability: 73, style: '执教纪律', bio: '丹麦老派教练。' },
  { id: 'daps2', nickname: 'Voo', realName: "Voo", country: '南非', countryCode: 'ZA', age: 32, ability: 73, style: '战术', bio: '南非体系教练。' },
  { id: 'jamez', nickname: 'JAMEZ', realName: "James Birtwistle", country: '英国', countryCode: 'GB', age: 31, ability: 74, style: '培养', bio: '英国青年队教练。' },
  { id: 'chenzo', nickname: 'chenzo', realName: "Vince Chen", country: '加拿大', countryCode: 'CA', age: 30, ability: 72, style: '临场', bio: '北美华裔教练。' },
  { id: 'ryu', nickname: 'Ryu', realName: "Ryu Seok", country: '韩国', countryCode: 'KR', age: 33, ability: 75, style: '战术', bio: '韩国体系教练。' },
  { id: 'xign2', nickname: 'XigN', realName: "Kim Seong-hun", country: '韩国', countryCode: 'KR', age: 30, ability: 71, style: '培养', bio: '韩国青年队教练。' },
  { id: 'karsa2', nickname: 'Karsa', realName: "Tang Jiajun", country: '中国', countryCode: 'CN', age: 26, ability: 70, style: '临场', bio: '刚转型的年轻教练。' },
  { id: 'spx', nickname: 'SPX', realName: "Sergey Petrov", country: '俄罗斯', countryCode: 'RU', age: 34, ability: 74, style: '战术', bio: '独联体二级赛区教练。' },
  { id: 'amd', nickname: 'AMD', realName: "Aleksandr Makarov", country: '俄罗斯', countryCode: 'RU', age: 32, ability: 72, style: '执教纪律', bio: '独联体新锐教练。' },];

export const COACH_MAP: Record<string, CoachIdentity> = Object.fromEntries(COACHES.map((c) => [c.id, c]));

/** 教练稀有度：按执教能力划分。 */
export function coachTier(ability: number): 'S' | 'A' | 'B' | 'C' {
  if (ability >= 90) return 'S';
  if (ability >= 82) return 'A';
  if (ability >= 75) return 'B';
  return 'C';
}

export const COACH_TIER_META: Record<'S' | 'A' | 'B' | 'C', { label: string; color: string; weight: number }> = {
  S: { label: '传奇教练', color: '#F2B233', weight: 4 },
  A: { label: '顶级教练', color: '#B06CF0', weight: 12 },
  B: { label: '一线教练', color: '#4FA3F7', weight: 34 },
  C: { label: '青训教练', color: '#9CA3AF', weight: 50 },
};

/** 教练包价格。 */
export const COACH_PACK = { single: 1500, ten: 13500 };