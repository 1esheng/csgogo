import { describe, expect, it } from 'vitest';
import { executePulls, pityStatus, rollRarity } from '@/game/packs';
import { PACK_CONFIG } from '@/data/config';
import { Rng } from '@/engine/rng';
import type { PackState, Rarity } from '@/types';
import { CARD_TEMPLATES, TEMPLATE_MAP } from '@/data/cards';
import { createNewGame } from '@/game/starter';
import { validateSnapshot, parseSaveFile, snapshotToJson } from '@/db/save';

const RANK: Record<Rarity, number> = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };

function freshPack(): PackState {
  return { sinceSR: 0, sinceSSR: 0, totalPulls: 0 };
}

describe('pack pity system', () => {
  it('guarantees at least one SR+ every 10 pulls', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const rng = new Rng(seed * 7919);
      const { results } = executePulls(rng, freshPack(), 10, []);
      const best = Math.max(...results.map((r) => RANK[r.rarity]));
      expect(best).toBeGreaterThanOrEqual(2);
    }
  });

  it('guarantees at least one SSR+ within 60 pulls', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const rng = new Rng(seed * 104729);
      const { results } = executePulls(rng, freshPack(), 60, []);
      const best = Math.max(...results.map((r) => RANK[r.rarity]));
      expect(best).toBeGreaterThanOrEqual(3);
    }
  });

  it('never lets the SR drought exceed the hard pity and flags the pull that fixed it', () => {
    let pack = freshPack();
    const rng = new Rng(20260401);
    let drought = 0;
    let forced = 0;
    for (let i = 0; i < 200; i += 1) {
      const out = executePulls(rng, pack, 1, []);
      pack = out.pack;
      const r = out.results[0];
      if (RANK[r.rarity] >= 2) { drought = 0; } else { drought += 1; }
      // 连续未出 SR+ 的次数永远不能达到硬保底数
      expect(drought).toBeLessThan(PACK_CONFIG.pitySR);
      if (r.pity === 'SR' || r.pity === 'SSR') forced += 1;
    }
    // 200 抽里必然出现过被保底兜底的抽卡
    expect(forced).toBeGreaterThan(0);
  });

  it('resets the SR counter when an SR+ drops', () => {
    const rng = new Rng(424242);
    let pack = freshPack();
    let sawReset = false;
    for (let i = 0; i < 40; i += 1) {
      const { results, pack: next } = executePulls(rng, pack, 1, []);
      if (RANK[results[0].rarity] >= 2) {
        expect(next.sinceSR).toBe(0);
        sawReset = true;
      }
      pack = next;
    }
    expect(sawReset).toBe(true);
  });

  it('counts pity progress and total pulls truthfully', () => {
    const rng = new Rng(99);
    const { pack } = executePulls(rng, freshPack(), 10, []);
    expect(pack.totalPulls).toBe(10);
    const status = pityStatus(pack);
    expect(status.srIn).toBeGreaterThanOrEqual(0);
    expect(status.srIn).toBeLessThanOrEqual(PACK_CONFIG.pitySR);
    expect(status.ssrProgress).toBeGreaterThanOrEqual(0);
    expect(status.ssrProgress).toBeLessThanOrEqual(1);
  });

  it('keeps the base distribution near the published rates', () => {
    const rng = new Rng(20250505);
    const counts: Record<Rarity, number> = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
    const pulls = 40000;
    for (let i = 0; i < pulls; i += 1) {
      counts[rollRarity(rng, { sinceSR: -1, sinceSSR: -1, totalPulls: i })] += 1;
    }
    // Pity disabled via negative counters -> pure base rates.
    expect(counts.N / pulls).toBeGreaterThan(0.5);
    expect(counts.UR / pulls).toBeLessThan(0.03);
    expect(counts.SSR / pulls).toBeGreaterThan(0.01);
  });

  it('marks duplicates and awards shards, never a second copy', () => {
    const rng = new Rng(7);
    const { results } = executePulls(rng, freshPack(), 30, [{ instanceId: 'x', templateId: CARD_TEMPLATES[0].id, level: 1, xp: 0, mastery: 0, acquiredAt: 0 }]);
    const dup = results.find((r) => r.template.id === CARD_TEMPLATES[0].id);
    if (dup) {
      expect(dup.isNew).toBe(false);
      expect(dup.shards).toBeGreaterThan(0);
    }
    results.forEach((r) => {
      if (r.isNew) expect(r.shards).toBe(0);
    });
  });
});

describe('save validation', () => {
  it('round-trips a fresh game', () => {
    const snapshot = createNewGame('Test Club');
    const json = snapshotToJson(snapshot);
    const parsed = parseSaveFile(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.snapshot?.club.name).toBe('Test Club');
    expect(parsed.snapshot?.cards.length).toBe(5);
  });

  it('rejects malformed json', () => {
    expect(parseSaveFile('{ not json').ok).toBe(false);
  });

  it('rejects a future save version', () => {
    const snapshot = createNewGame('Future');
    const result = validateSnapshot({ ...snapshot, version: 999 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('更新的游戏版本');
  });

  it('rejects unknown card templates and broken squads', () => {
    const snapshot = createNewGame('Broken');
    const badCards = validateSnapshot({ ...snapshot, cards: [{ instanceId: 'a', templateId: 'tpl-does-not-exist', level: 1, xp: 0, mastery: 0, acquiredAt: 0 }] });
    expect(badCards.ok).toBe(false);
    const badSquad = validateSnapshot({ ...snapshot, squad: { ...snapshot.squad, slots: { ...snapshot.squad.slots, AWPer: 'ghost-card' } } });
    expect(badSquad.ok).toBe(true);
    expect(badSquad.snapshot!.squad.slots.AWPer).toBeNull();
    const negativeCoins = validateSnapshot({ ...snapshot, club: { ...snapshot.club, coins: -5 } });
    expect(negativeCoins.ok).toBe(false);
  });

  it('migrates old season cards to the current 2026 card', () => {
    const snapshot = createNewGame('Migrating');
    snapshot.cards = [
      { instanceId: 'old1', templateId: 'tpl-m0nesy-2022', level: 3, xp: 900, mastery: 10, acquiredAt: 0 },
      { instanceId: 'old2', templateId: 'tpl-zywoo-2019', level: 2, xp: 400, mastery: 0, acquiredAt: 0 },
    ];
    snapshot.squad = { slots: { AWPer: 'old1', Entry: null, Lurker: 'old2', Support: null, Anchor: null }, igl: 'old1', synergy: 40, matchesTogether: 0 };
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(true);
    const ids = result.snapshot!.cards.map((c) => c.templateId).sort();
    expect(ids).toEqual(['tpl-m0nesy-2026', 'tpl-zywoo-2026']);
    expect(result.snapshot!.cards.find((c) => c.templateId === 'tpl-m0nesy-2026')!.level).toBe(3);
    expect(result.snapshot!.squad.slots.AWPer).toBe('old1');
    expect(result.snapshot!.squad.igl).toBe('old1');
  });

  it('accepts every shipped template id as a valid collection', () => {
    const snapshot = createNewGame('Collector');
    snapshot.cards = CARD_TEMPLATES.map((t, i) => ({ instanceId: 'c' + i, templateId: t.id, level: 1, xp: 0, mastery: 0, acquiredAt: 0 }));
    // The starter lineup points at the five original instances, so clear it first.
    snapshot.squad = { slots: { AWPer: null, Entry: null, Lurker: null, Support: null, Anchor: null }, igl: null, synergy: 40, matchesTogether: 0 };
    expect(validateSnapshot(snapshot).ok).toBe(true);
    expect(Object.keys(TEMPLATE_MAP).length).toBe(CARD_TEMPLATES.length);
  });
});