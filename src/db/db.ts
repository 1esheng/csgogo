import Dexie, { type Table } from 'dexie';
import type { GameSnapshot, MatchEvent, MapId, RoundRecord } from '@/types';

export interface SaveRow {
  id: string;
  savedAt: number;
  version: number;
  data: GameSnapshot;
}

export interface ReplayRow {
  id: string;
  at: number;
  mapId: MapId;
  result: string;
  events: MatchEvent[];
  rounds: RoundRecord[];
}

class DynastyDatabase extends Dexie {
  saves!: Table<SaveRow, string>;
  replays!: Table<ReplayRow, string>;

  constructor() {
    super('cs2-dynasty');
    this.version(1).stores({ saves: 'id, savedAt', replays: 'id, at' });
  }
}

export const db = new DynastyDatabase();
export const SAVE_KEY = 'current';
export const MAX_REPLAYS = 20;
/// 每次写入前把上一份正式存档留成备份，最多保留 5 份（防止误覆盖 / 坏存档）。
export const BACKUP_PREFIX = 'backup-';
export const MAX_BACKUPS = 20;

export async function loadSave(): Promise<GameSnapshot | null> {
  try {
    const row = await db.saves.get(SAVE_KEY);
    return row ? row.data : null;
  } catch (err) {
    console.error('Failed to load save', err);
    return null;
  }
}

export async function writeSave(snapshot: GameSnapshot): Promise<void> {
  await rotateBackup(snapshot);
  await db.saves.put({
    id: SAVE_KEY,
    savedAt: Date.now(),
    version: snapshot.version,
    data: snapshot,
  });
}

/** 用一份轻量指纹判断两份存档是否是同一个状态，避免把 5 个槽位全部塞满重复内容。 */
function fingerprint(s: GameSnapshot): string {
  const parts = [
    s.club?.name, s.club?.coins, s.club?.xp, s.club?.wins, s.club?.losses, s.club?.level,
    s.cards?.length, s.career?.titles, s.career?.tier, s.matches?.length,
    s.cards?.reduce((sum, c) => sum + (c.level ?? 0) * 7 + ((c.stars ?? 1) - 1) * 13, 0),
    s.squad?.igl, Object.values(s.squad?.slots ?? {}).join(','),
  ];
  return parts.join('|');
}

/** 把当前正式存档复制成一份带时间戳的备份（内容相同则跳过），并裁剪到 MAX_BACKUPS 份。 */
async function rotateBackup(next?: GameSnapshot): Promise<void> {
  try {
    const current = await db.saves.get(SAVE_KEY);
    if (!current) return;
    if (next && fingerprint(current.data) === fingerprint(next)) return;
    const fp = fingerprint(current.data);
    const all = await db.saves.toArray();
    const backups = all.filter((r) => r.id.startsWith(BACKUP_PREFIX)).sort((a, b) => b.savedAt - a.savedAt);
    if (backups.some((r) => fingerprint(r.data) === fp)) return;
    const id = BACKUP_PREFIX + current.savedAt.toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    await db.saves.put({ ...current, id });
    const trimmed = [...backups, { ...current, id }].sort((a, b) => b.savedAt - a.savedAt).slice(MAX_BACKUPS);
    const keep = new Set(trimmed.map((r) => r.id));
    const drop = all.filter((r) => r.id.startsWith(BACKUP_PREFIX) && !keep.has(r.id)).map((r) => r.id);
    if (drop.length) await db.saves.bulkDelete(drop);
  } catch (err) {
    console.error('backup failed', err);
  }
}

export interface BackupInfo { id: string; savedAt: number; clubName: string; coins: number; cards: number }

export async function listBackups(): Promise<BackupInfo[]> {
  try {
    const all = await db.saves.toArray();
    return all
      .filter((r) => r.id.startsWith(BACKUP_PREFIX))
      .sort((a, b) => b.savedAt - a.savedAt)
      .map((r) => ({
        id: r.id,
        savedAt: r.savedAt,
        clubName: r.data.club?.name ?? '?',
        coins: r.data.club?.coins ?? 0,
        cards: r.data.cards?.length ?? 0,
      }));
  } catch {
    return [];
  }
}

/** 用某份备份覆盖当前存档（覆盖前同样会先备份当前存档）。 */
export async function restoreBackup(id: string): Promise<GameSnapshot | null> {
  const row = await db.saves.get(id);
  if (!row) return null;
  await rotateBackup();
  await db.saves.put({ ...row, id: SAVE_KEY, savedAt: Date.now() });
  return row.data;
}

export async function writeReplay(row: ReplayRow): Promise<void> {
  await db.replays.put(row);
  const all = await db.replays.orderBy('at').toArray();
  if (all.length > MAX_REPLAYS) {
    const excess = all.slice(0, all.length - MAX_REPLAYS);
    await db.replays.bulkDelete(excess.map((r) => r.id));
  }
}

export async function listReplays(): Promise<ReplayRow[]> {
  try {
    const all = await db.replays.orderBy('at').reverse().toArray();
    return all;
  } catch {
    return [];
  }
}

export async function loadReplay(id: string): Promise<ReplayRow | undefined> {
  return db.replays.get(id);
}

export async function clearDatabase(): Promise<void> {
  await db.saves.clear();
  await db.replays.clear();
}