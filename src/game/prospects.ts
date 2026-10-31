import type { Attributes, CardTemplate, CombatRole, MapId, PlayerIdentity, Prospect, Role } from '@/types';
import { PROSPECT_CONFIG } from '@/data/config';
import { ROLE_GROWTH } from '@/data/config';
import type { Rng } from '@/engine/rng';
import { makeId } from '@/engine/rng';

const NAMES = ['疾风', '寒霜', '暗刃', '雷鸣', '赤霄', '夜莺', '孤星', '流火', '铁心', '白鸦', '墨影', '苍穹', '星屑', '惊蛰', '霜刃'];
const COUNTRIES: { country: string; code: string }[] = [
  { country: '瑞典', code: 'SE' }, { country: '巴西', code: 'BR' }, { country: '波兰', code: 'PL' },
  { country: '丹麦', code: 'DK' }, { country: '法国', code: 'FR' }, { country: '俄罗斯', code: 'RU' },
  { country: '中国', code: 'CN' }, { country: '哈萨克斯坦', code: 'KZ' }, { country: '美国', code: 'US' },
  { country: '芬兰', code: 'FI' }, { country: '蒙古', code: 'MN' }, { country: '乌克兰', code: 'UA' },
];
const TRAITS = ['可塑性强', '枪法生猛', '大器晚成', '稳定输出', '脾气火爆', '沉默领袖', '道具狂人', '残局猎手'];
const ROLES: CombatRole[] = ['AWPer', 'Entry', 'Lurker', 'Support', 'Anchor'];
const MAPS: MapId[] = ['Mirage', 'Inferno', 'Nuke'];

export function generateProspect(rng: Rng): Prospect {
  const role = rng.pick(ROLES);
  const ovr = rng.int(PROSPECT_CONFIG.minOvr, PROSPECT_CONFIG.maxOvr);
  const potential = rng.int(Math.max(ovr + 8, PROSPECT_CONFIG.minPotential), PROSPECT_CONFIG.maxPotential);
  const nickname = rng.pick(NAMES) + rng.int(1, 99);
  const place = rng.pick(COUNTRIES);
  const attributes = (Object.keys(ROLE_GROWTH[role]) as (keyof Attributes)[]).reduce((acc, key, index) => {
    acc[key] = Math.max(30, Math.min(92, ovr + rng.int(-5, 6) - index));
    return acc;
  }, { aim: ovr, reflex: ovr, positioning: ovr, gameSense: ovr, utility: ovr, teamwork: ovr, clutch: ovr, leadership: ovr } as Attributes);

  const proficiency = { AWPer: 40, Entry: 40, Lurker: 40, Support: 40, Anchor: 40, IGL: 30 };
  proficiency[role] = rng.int(72, 94);
  proficiency[role === 'Anchor' ? 'Support' : 'Anchor'] = rng.int(45, 68);

  const mapProficiency = MAPS.reduce((acc, id) => {
    acc[id] = rng.int(45, 80);
    return acc;
  }, {} as Record<MapId, number>);

  const traitCount = rng.int(1, 2);
  const traits: string[] = [];
  for (let i = 0; i < traitCount; i += 1) {
    const t = rng.pick(TRAITS);
    if (!traits.includes(t)) traits.push(t);
  }

  return {
    id: makeId('youth'),
    nickname,
    country: place.country,
    countryCode: place.code,
    age: rng.int(16, 19),
    ovr,
    potential,
    primaryRole: role,
    secondaryRole: (role === 'Anchor' ? 'Support' : 'Anchor') as Role,
    growthRate: Math.round(rng.float(0.8, 1.35) * 100) / 100,
    traits,
    status: 'academy',
    attributes,
    proficiency,
    mapProficiency,
    createdAt: Date.now(),
  };
}

export function prospectToIdentity(p: Prospect): PlayerIdentity {
  return {
    id: p.id,
    nickname: p.nickname,
    realName: p.nickname,
    country: p.country,
    countryCode: p.countryCode,
    age: p.age,
  };
}

export function prospectToTemplate(p: Prospect, season: string): CardTemplate {
  return {
    id: 'tpl-' + p.id,
    playerId: p.id,
    season,
    rarity: p.potential >= 92 ? 'SSR' : p.potential >= 86 ? 'SR' : 'R',
    primaryRole: p.primaryRole,
    secondaryRole: p.secondaryRole,
    attributes: p.attributes,
    proficiency: p.proficiency,
    mapProficiency: p.mapProficiency,
    skill: {
      id: 'youth-' + p.id,
      name: p.traits[0] ?? 'Academy Graduate',
      icon: 'sparkles',
      description: p.traits.join(', ') || 'Academy graduate',
      kind: 'synergy',
      key: 'synergy',
      value: 2,
    },
    growth: p.growthRate,
  };
}