// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import { useGameStore } from '@/stores/gameStore';

it('空阵容的存档会被自动补全', async () => {
  await useGameStore.getState().newGame('自动补全');
  const snap = useGameStore.getState().snapshot();
  snap.squad = { ...snap.squad, slots: { AWPer: null, Entry: null, Lurker: null, Support: null, Anchor: null }, igl: null };
  // 模拟重新载入
  const db = await new Promise<any>((res, rej) => { const rq = indexedDB.open('cs2-dynasty'); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
  await new Promise<void>((res, rej) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put({ id: 'current', savedAt: Date.now(), version: 4, data: snap }); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  await useGameStore.getState().init();
  await new Promise((r) => setTimeout(r, 30));
  console.log('filled after reload', useGameStore.getState().squadRating().filled);
  expect(useGameStore.getState().squadRating().filled).toBe(5);
});