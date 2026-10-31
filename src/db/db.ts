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
  await db.saves.put({
    id: SAVE_KEY,
    savedAt: Date.now(),
    version: snapshot.version,
    data: snapshot,
  });
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