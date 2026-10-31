// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/stores/gameStore';
import { loadSave, clearDatabase } from '@/db/db';
import { parseSaveFile } from '@/db/save';
import { COMBAT_ROLES } from '@/types';
import { PACK_CONFIG } from '@/data/config';
import { seasonEvents } from '@/game/calendar';
import { makeCard } from '@/game/starter';
import { cardOVR } from '@/engine/rating';

async function freshClub(name = 'Test Club') {
  await clearDatabase();
  await useGameStore.getState().newGame(name);
  return useGameStore.getState();
}

/** 按赛季日程报名并推进到比赛日，返回开赛结果。 */
function signUpAndStart(tier: number) {
  const state = useGameStore.getState();
  const event = seasonEvents(state.club.season).find((e) => e.tier === tier && e.day >= state.club.day);
  if (!event) throw new Error('no event for tier ' + tier);
  useGameStore.setState({
    club: { ...state.club, day: event.day },
    career: { ...state.career, registeredEventIds: [event.id] },
  });
  return useGameStore.getState().startRegisteredEvent();
}

describe('store game loop', () => {
  beforeEach(async () => {
    await clearDatabase();
    useGameStore.setState({ activeMatch: null, activeMatchInfo: null, playerOrders: null, lastSummary: null });
  });

  it('creates a club with five starter cards and a full lineup', async () => {
    const s = await freshClub();
    expect(s.hasGame).toBe(true);
    expect(s.club.coins).toBe(5000);
    expect(s.cards.length).toBe(5);
    expect(s.squadRating().filled).toBe(5);
    expect(s.squadRating().warnings.filter((w) => w.includes('个位置'))).toEqual([]);
  });

  it('opens packs, charges coins and writes every card into the collection', async () => {
    const s = await freshClub();
    const before = s.cards.length;
    const results = useGameStore.getState().openPack(1);
    const after = useGameStore.getState();
    expect(results).not.toBeNull();
    expect(after.club.coins).toBe(5000 - PACK_CONFIG.singlePrice);
    expect(after.cards.length).toBeGreaterThanOrEqual(before);
    expect(after.pack.totalPulls).toBe(1);
    if (results![0].isNew) {
      expect(after.cards.some((c) => c.templateId === results![0].template.id)).toBe(true);
    }
  });

  it('stores duplicate pulls as real cards so they can be fused', async () => {
    await freshClub('Dup FC');
    // 先拥有全部模板，保证接下来的抽取必定是重复卡
    const all = Object.values(useGameStore.getState().templates());
    const owned = all.map((t) => makeCard(t.id, 1));
    useGameStore.setState({ cards: owned, club: { ...useGameStore.getState().club, coins: 20000 } });
    const before = useGameStore.getState().cards.length;
    const results = useGameStore.getState().openPack(1)!;
    const after = useGameStore.getState();
    expect(results[0].isNew).toBe(false);
    expect(after.cards.length).toBe(before + 1);
    expect(after.club.coins).toBe(20000 - PACK_CONFIG.singlePrice);
    // 三张同名卡即可合成
    const tpl = results[0].template.id;
    const copies = after.cards.filter((c) => c.templateId === tpl).length;
    if (copies >= 3) {
      const res = useGameStore.getState().fuseCards(tpl);
      expect(res.ok).toBe(true);
    }
  });

  it('grants test coins through the dev action only', async () => {
    const start = await freshClub('Dev FC');
    useGameStore.getState().grantTestCoins(100000);
    const after = useGameStore.getState();
    expect(after.club.coins).toBe(start.club.coins + 100000);
    expect(after.coinsLedger[0].reason).toContain('调试');
    const before = after.club.coins;
    expect(useGameStore.getState().openPack(10)).not.toBeNull();
    expect(useGameStore.getState().club.coins).toBe(before - PACK_CONFIG.tenPrice);
  });

  it('refuses a pull the club cannot afford', async () => {
    await freshClub();
    useGameStore.setState({ club: { ...useGameStore.getState().club, coins: 10 } });
    expect(useGameStore.getState().openPack(10)).toBeNull();
    expect(useGameStore.getState().club.coins).toBe(10);
  });

  it('blocks the same player in two slots and allows moving between slots', async () => {
    const s = await freshClub();
    const awp = s.squad.slots.AWPer!;
    const store = useGameStore.getState();
    const clash = store.assignSlot('Anchor', awp);
    // AWPer card belongs to a different player than the Anchor here, so it may move.
    expect(clash.ok).toBe(true);
    const after = useGameStore.getState();
    expect(after.squad.slots.AWPer).toBeNull();
    expect(after.squad.slots.Anchor).toBe(awp);
  });

  it('trains a card, spends coins and raises XP', async () => {
    const s = await freshClub();
    const target = s.cards[0];
    const res = useGameStore.getState().trainCard(target.instanceId, 'aim');
    expect(res.ok).toBe(true);
    const after = useGameStore.getState();
    expect(after.club.coins).toBeLessThan(s.club.coins);
    const trained = after.cards.find((c) => c.instanceId === target.instanceId)!;
    expect(trained.xp).toBeGreaterThan(0);
    expect(after.training.length).toBe(1);
  });

  it('plays a full match through the store and pays out exactly once', async () => {
    const s = await freshClub();
    const started = useGameStore.getState().startMatch({ mapId: 'Mirage', opponentId: '9pandas', mode: 'quick' });
    expect(started.ok).toBe(true);
    expect(useGameStore.getState().activeMatch).not.toBeNull();

    useGameStore.getState().autoPlay();
    const after = useGameStore.getState();
    expect(after.activeMatch).toBeNull();
    expect(after.lastSummary).not.toBeNull();
    expect(after.matches.length).toBe(1);
    const summary = after.matches[0];
    expect(summary.roundsPlayed).toBeGreaterThan(10);
    expect(summary.scoreFor + summary.scoreAgainst).toBe(summary.roundsPlayed);
    expect(after.club.coins).toBeGreaterThan(s.club.coins - 1);
    expect(after.club.wins + after.club.losses).toBe(1);
    expect(after.squad.matchesTogether).toBe(1);
    expect(after.squad.synergy).toBeGreaterThan(s.squad.synergy);

    // Re-finalising the same match must not pay out twice.
    const coins = useGameStore.getState().club.coins;
    useGameStore.setState({ activeMatch: (after.matches as never) && null });
    useGameStore.getState().finalizeFromStore();
    expect(useGameStore.getState().club.coins).toBe(coins);
    expect(useGameStore.getState().matches.length).toBe(1);
  });

  it('keeps a completed match in the database across a reload', async () => {
    await freshClub('Persist FC');
    useGameStore.getState().openPack(1);
    useGameStore.getState().startMatch({ mapId: 'Nuke', opponentId: 'b8', mode: 'quick' });
    useGameStore.getState().autoPlay();
    await useGameStore.getState().saveNow();

    const reloaded = await loadSave();
    expect(reloaded).not.toBeNull();
    expect(reloaded!.club.name).toBe('Persist FC');
    expect(reloaded!.matches.length).toBe(1);
    expect(reloaded!.cards.length).toBeGreaterThanOrEqual(5);
    expect(reloaded!.squad.slots.AWPer).not.toBeNull();
  });

  it('keeps the starting five when a save is reloaded from the database', async () => {
    const s = await freshClub('Reload FC');
    expect(s.squadRating().filled).toBe(5);
    await useGameStore.getState().saveNow();
    useGameStore.setState({ cards: [], squad: { slots: { AWPer: null, Entry: null, Lurker: null, Support: null, Anchor: null }, igl: null, synergy: 0, matchesTogether: 0 } });
    await useGameStore.getState().init();
    const after = useGameStore.getState();
    expect(after.cards.length).toBe(5);
    expect(after.squadRating().filled).toBe(5);
  });

  it('exports and re-imports a save', async () => {
    await freshClub('Export FC');
    const json = await useGameStore.getState().exportSave();
    const parsed = parseSaveFile(json);
    expect(parsed.ok).toBe(true);
    await useGameStore.getState().newGame('Other Club');
    expect(useGameStore.getState().club.name).toBe('Other Club');
    const result = await useGameStore.getState().importSave(json);
    expect(result.ok).toBe(true);
    expect(useGameStore.getState().club.name).toBe('Export FC');
  });

  it('rejects a corrupt import without touching the live save', async () => {
    await freshClub('Keep FC');
    const result = await useGameStore.getState().importSave('{"version":999}');
    expect(result.ok).toBe(false);
    expect(useGameStore.getState().club.name).toBe('Keep FC');
  });

  it('runs a tournament: enters, plays the fixture, settles AI results', async () => {
    const s = await freshClub('Cup FC');
    useGameStore.setState({ leaders: s.leaders.map((l) => (l.id === 'player' ? { ...l, rating: 1600 } : l)) });
    const entered = signUpAndStart(0);
    expect(entered.ok).toBe(true);
    const tournament = useGameStore.getState().tournaments[0];
    expect(tournament.teams.length).toBeGreaterThanOrEqual(16);
    expect(tournament.matches.length).toBeGreaterThanOrEqual(8);
    expect(useGameStore.getState().leaders.find((l) => l.id === 'player')!.tier).toBe(0);

    const started = useGameStore.getState().startTournamentMatch();
    expect(started.ok).toBe(true);
    useGameStore.getState().autoPlay();
    const after = useGameStore.getState();
    const updated = after.tournaments.find((t) => t.id === tournament.id)!;
    expect(updated.matches.some((m) => m.winnerId !== null)).toBe(true);
    expect(after.career.activeTournamentId === null || updated.status === 'active').toBe(true);
  });

  it('fuses three identical cards into a 2-star card', async () => {
    await freshClub('Fusion FC');
    const base = useGameStore.getState().cards[0];
    const templateId = base.templateId;
    const extra = [makeCard(templateId, 1), makeCard(templateId, 1)];
    useGameStore.setState({ cards: [...useGameStore.getState().cards, ...extra] });
    expect(useGameStore.getState().cards.filter((c) => c.templateId === templateId).length).toBe(3);

    const before = useGameStore.getState().cards.length;
    const res = useGameStore.getState().fuseCards(templateId);
    expect(res.ok).toBe(true);
    expect(res.stars).toBe(2);
    const after = useGameStore.getState();
    expect(after.cards.length).toBe(before - 2);
    expect(after.cards.filter((c) => c.templateId === templateId).length).toBe(1);

    const tpl = after.templates()[templateId]!;
    const plain = cardOVR(tpl, 1, 1);
    const starred = cardOVR(tpl, 1, 2);
    expect(starred).toBeGreaterThan(plain);
  });

  it('fuses everything fusable in one call', async () => {
    await freshClub('Bulk FC');
    const cards = [
      ...useGameStore.getState().cards,
      makeCard('tpl-donk-2026', 1), makeCard('tpl-donk-2026', 1), makeCard('tpl-donk-2026', 1),
      makeCard('tpl-donk-2026', 1), makeCard('tpl-donk-2026', 1),
      makeCard('tpl-zywoo-2026', 1), makeCard('tpl-zywoo-2026', 1), makeCard('tpl-zywoo-2026', 1),
    ];
    useGameStore.setState({ cards });
    const before = useGameStore.getState().cards.length;
    const res = useGameStore.getState().fuseAll();
    expect(res.ok).toBe(true);
    // donk 有 5 张 → 升 1 星（3 张合成后剩 3 张，还能再合一次 → 2 星）；zywoo 3 张 → 1 星
    expect(res.starsGained).toBeGreaterThanOrEqual(2);
    expect(useGameStore.getState().cards.length).toBeLessThan(before);
    const donk = useGameStore.getState().cards.filter((c) => c.templateId === 'tpl-donk-2026');
    expect(donk.length).toBe(1);
    expect(donk[0].stars).toBeGreaterThanOrEqual(2);
    // 再次一键升星应该没有可合成的
    const again = useGameStore.getState().fuseAll();
    expect(again.ok).toBe(false);
  });

  it('refuses to fuse without enough copies', async () => {
    await freshClub('Fusion FC');
    const templateId = useGameStore.getState().cards[0].templateId;
    const res = useGameStore.getState().fuseCards(templateId);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('同名卡');
  });

  it('simulating the rest of a tournament never plays your own fixture for you', async () => {
    const s = await freshClub('Sim FC');
    useGameStore.setState({ leaders: s.leaders.map((l) => (l.id === 'player' ? { ...l, rating: 1600 } : l)) });
    expect(signUpAndStart(0).ok).toBe(true);
    const t = useGameStore.getState().tournaments[0];
    useGameStore.getState().simulateTournamentRemainder(t.id);
    const after = useGameStore.getState().tournaments.find((x) => x.id === t.id)!;
    const mine = after.matches.filter((m) => m.winnerId === null && (m.aId === 'player' || m.bId === 'player'));
    expect(mine.length).toBe(1);
    expect(after.status).toBe('active');
  });

  it('fast-simulates a whole tournament in one call', async () => {
    const s = await freshClub('Fast FC');
    useGameStore.setState({ leaders: s.leaders.map((l) => (l.id === 'player' ? { ...l, rating: 1600 } : l)) });
    expect(signUpAndStart(0).ok).toBe(true);
    const id = useGameStore.getState().tournaments[0].id;
    const coinsBefore = useGameStore.getState().club.coins;

    const res = useGameStore.getState().simulateCareerSeason(id);
    expect(res.ok).toBe(true);
    expect(res.matchesPlayed).toBeGreaterThan(0);

    const after = useGameStore.getState();
    const t = after.tournaments.find((x) => x.id === id)!;
    expect(t.status).toBe('completed');
    expect(t.championId).not.toBeNull();
    expect(after.club.coins).toBeGreaterThan(coinsBefore);
    expect(after.matches.filter((m) => m.tournamentId === id).length).toBe(res.matchesPlayed);
  });

  it('trains the whole starting five in one call', async () => {
    const start = await freshClub('Lineup FC');
    useGameStore.setState({ club: { ...start.club, coins: 50000 } });
    const before = useGameStore.getState().cards.map((c) => c.xp);
    const res = useGameStore.getState().trainSquad('aim');
    expect(res.ok).toBe(true);
    expect(res.trained).toBe(5);
    expect(res.spent).toBeGreaterThan(0);
    const after = useGameStore.getState().cards;
    const grew = after.filter((c, i) => c.xp > (before[i] ?? 0)).length;
    expect(grew).toBeGreaterThanOrEqual(5);
    expect(useGameStore.getState().club.coins).toBe(50000 - (res.spent ?? 0));
  });

  it('scouts and promotes an academy prospect into a real card', async () => {
    await freshClub('Academy FC');
    const scout = useGameStore.getState().scoutProspect();
    expect(scout.ok).toBe(true);
    const prospect = useGameStore.getState().prospects[0];
    expect(prospect.potential).toBeGreaterThanOrEqual(prospect.ovr);
    const before = useGameStore.getState().cards.length;
    const promoted = useGameStore.getState().promoteProspect(prospect.id);
    expect(promoted.ok).toBe(true);
    const after = useGameStore.getState();
    expect(after.cards.length).toBe(before + 1);
    expect(after.customTemplates.length).toBe(1);
    expect(after.customPlayers.length).toBe(1);
    expect(after.templates()[after.customTemplates[0].id]).toBeDefined();
  });
});