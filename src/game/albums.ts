import type { CardTemplate, GameSnapshot, PlayerIdentity, Rarity } from '@/types';
import { PLAYER_MAP, TEMPLATE_MAP } from '@/data/cards';
import { AI_TEAMS } from '@/data/aiTeams';
import { SYNERGY } from '@/data/config';

/**
 * 收藏册：按现有卡数据的战队（AI_TEAMS 的阵容）与国籍（选手身份层）自动成册。
 * 集齐一册给永久小幅加成——只把默契值送进现有输入，不碰任何引擎常量。
 */
export type AlbumKind = 'team' | 'country';

/** 一册里至少要有几张卡才值得单独成册。 */
export const ALBUM_MIN_CARDS = 3;

/** 每集齐一册：阵容默契 +0.5 点。 */
export const ALBUM_BONUS_PER_ALBUM = 0.5;

/** 收藏册加成的默契点数上限。 */
export const ALBUM_BONUS_CAP = 8;

export interface AlbumEntry {
  templateId: string;
  playerId: string;
  nickname: string;
  rarity: Rarity;
  owned: boolean;
}

export interface Album {
  id: string;
  kind: AlbumKind;
  name: string;
  nameEn: string;
  entries: AlbumEntry[];
  total: number;
  owned: number;
  complete: boolean;
}

type AlbumInput = Pick<GameSnapshot, 'cards' | 'customTemplates' | 'customPlayers'>;

/** 内置模板 + 存档里生成的青训模板，选手身份同理。 */
function registries(s: AlbumInput): {
  templates: Record<string, CardTemplate>;
  players: Record<string, PlayerIdentity>;
} {
  const templates: Record<string, CardTemplate> = { ...TEMPLATE_MAP };
  (s.customTemplates ?? []).forEach((t) => { templates[t.id] = t; });
  const players: Record<string, PlayerIdentity> = { ...PLAYER_MAP };
  (s.customPlayers ?? []).forEach((p) => { players[p.id] = p; });
  return { templates, players };
}

function buildAlbum(
  id: string,
  kind: AlbumKind,
  name: string,
  nameEn: string,
  templateIds: string[],
  templates: Record<string, CardTemplate>,
  players: Record<string, PlayerIdentity>,
  owned: Set<string>,
): Album | null {
  const seen = new Set<string>();
  const entries: AlbumEntry[] = [];
  templateIds.forEach((templateId) => {
    if (seen.has(templateId)) return;
    const template = templates[templateId];
    if (!template) return;
    seen.add(templateId);
    const player = players[template.playerId];
    entries.push({
      templateId,
      playerId: template.playerId,
      nickname: player?.nickname ?? template.playerId,
      rarity: template.rarity,
      owned: owned.has(templateId),
    });
  });
  if (entries.length < ALBUM_MIN_CARDS) return null;
  const ownedCount = entries.filter((e) => e.owned).length;
  return {
    id,
    kind,
    name,
    nameEn,
    entries,
    total: entries.length,
    owned: ownedCount,
    complete: ownedCount === entries.length,
  };
}

/** 按战队与国籍自动生成全部收藏册。 */
export function buildAlbums(s: AlbumInput): Album[] {
  const { templates, players } = registries(s);
  const owned = new Set((s.cards ?? []).map((c) => c.templateId));
  const albums: Album[] = [];

  AI_TEAMS.forEach((team) => {
    const album = buildAlbum(
      'team:' + team.id, 'team', team.name, team.name,
      team.lineup.map((slot) => slot.templateId),
      templates, players, owned,
    );
    if (album) albums.push(album);
  });

  const byCountry = new Map<string, { name: string; ids: string[] }>();
  Object.values(templates).forEach((template) => {
    const player = players[template.playerId];
    if (!player) return;
    const code = player.countryCode || player.country || 'XX';
    const entry = byCountry.get(code);
    if (entry) entry.ids.push(template.id);
    else byCountry.set(code, { name: player.country || code, ids: [template.id] });
  });
  byCountry.forEach((bucket, code) => {
    const album = buildAlbum('country:' + code, 'country', bucket.name, code, bucket.ids, templates, players, owned);
    if (album) albums.push(album);
  });

  return albums.sort((a, b) => (
    Number(a.complete) - Number(b.complete)
    || (b.owned / b.total) - (a.owned / a.total)
    || a.name.localeCompare(b.name)
  ));
}

export function completedAlbumCount(albums: Album[]): number {
  return albums.filter((a) => a.complete).length;
}

/** 收藏册带来的默契点数（每册 +0.5，封顶 +8）。 */
export function albumSynergyBonus(s: AlbumInput): number {
  return Math.min(ALBUM_BONUS_CAP, completedAlbumCount(buildAlbums(s)) * ALBUM_BONUS_PER_ALBUM);
}

/** 把收藏册加成并进阵容默契——这是引擎本来就在用的输入，上限仍是 SYNERGY.max。 */
export function effectiveSynergy(base: number, bonus: number): number {
  return Math.min(SYNERGY.max, Math.max(0, base + bonus));
}
