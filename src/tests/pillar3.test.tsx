// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { GameSnapshot, MatchStatLine, MatchSummary, OwnedCoach, Tournament } from '@/types';
import { useGameStore, type GameStore } from '@/stores/gameStore';
import { createNewGame, makeCard } from '@/game/starter';
import { CARD_TEMPLATES } from '@/data/cards';
import { COMBAT_ROLES } from '@/types';
import { COACHES } from '@/data/coaches';
import { SYNERGY } from '@/data/config';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '@/data/achievements';
import { MILESTONES, maxConsecutiveMajors, milestoneClaimId, milestoneRows } from '@/game/milestones';
import { ALBUM_BONUS_CAP, ALBUM_BONUS_PER_ALBUM, albumSynergyBonus, buildAlbums, effectiveSynergy } from '@/game/albums';
import { ENDINGS, endingClaimId, pendingEndings, triggeredEndings } from '@/game/endings';
import { buildHallOfFame } from '@/features/career/HallOfFame';
import { HallOfFame } from '@/features/career/HallOfFame';
import { MilestonePanel } from '@/features/career/MilestonePanel';
import { AlbumPanel } from '@/features/collection/AlbumPanel';
import { EndingBanner } from '@/features/career/EndingBanner';
import { AchievementsPage } from '@/pages/AchievementsPage';

/** 支柱三新增的 36 条成就 id（旧存档里这些应当全部未达成）。 */
const NEW_IDS = [
  'season3', 'season5', 'title10', 'matches50', 'matches200', 'events10', 'tiersPlayed10', 'streak15', 'blowout5', 'tight10',
  'cards250', 'cards300', 'ur10', 'star10', 'level30', 'pulls500', 'pulls1000', 'mastery90', 'copies9', 'starred5',
  'coachS3', 'coachS5', 'headCoach10', 'coaches10', 'coaches20', 'coachXp1000',
  'tacticDocs3', 'tacticDocs7', 'scout5', 'synergy70', 'together50',
  'coins100k', 'badgeSet', 'retiredLegend', 'academyFull', 'emptyPockets',
];

function seedStore(overrides: Partial<GameStore> = {}) {
  const snap = createNewGame('Pillar3 FC');
  useGameStore.setState({
    ready: true,
    hasGame: true,
    club: snap.club,
    cards: snap.cards,
    squad: snap.squad,
    pack: snap.pack,
    training: [],
    matches: [],
    prospects: [],
    leaders: snap.leaders,
    career: snap.career,
    tournaments: [],
    settings: snap.settings,
    tasks: snap.tasks,
    coaches: [],
    headCoachId: null,
    coachXp: {},
    tacticDefaults: {},
    claimedAchievements: [],
    coinsLedger: snap.coinsLedger,
    customTemplates: [],
    customPlayers: [],
    activeMatch: null,
    activeMatchInfo: null,
    playerOrders: null,
    lastSummary: null,
    lastPackResults: null,
    ...overrides,
  });
}

function statLine(cardInstanceId: string, nickname: string): MatchStatLine {
  return {
    cardInstanceId, playerId: nickname.toLowerCase(), nickname, teamId: 'player', side: 'T',
    kills: 20, deaths: 12, assists: 4, adr: 88.5, kast: 72, kd: 1.66, rating: 1.24,
    openingKills: 3, openingDeaths: 2, multiKills: 1, clutches: 1, damage: 1590, rounds: 18,
  };
}

function summary(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    id: 'match-' + Math.random().toString(36).slice(2),
    playedAt: 1, mapId: 'Mirage', opponentName: 'NAVI', teamName: 'Pillar3 FC',
    scoreFor: 13, scoreAgainst: 5, won: true, roundsPlayed: 18, seed: 7,
    scoreboard: [], mvp: null, coins: 420, xp: 150, keyRounds: [], mode: 'career',
    ...overrides,
  };
}

function losslessTournament(): Tournament {
  return {
    id: 'ev-1', name: '城市联赛 S2', tier: 1, status: 'completed',
    teams: [{ id: 'player', name: 'Pillar3 FC', rating: 1000, isPlayer: true }],
    matches: [], playerTeamId: 'player', size: 8, format: 'single', lossLimit: 1, winsNeeded: 3,
    playerWins: 3, playerLosses: 0, prizePool: 4200, createdAt: 1, championId: 'player', seed: 3,
  };
}

afterEach(() => cleanup());

describe('pillar 3 · achievement catalog', () => {
  it('ships 60 achievements across five tagged categories', () => {
    expect(ACHIEVEMENTS).toHaveLength(60);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(60);
    ACHIEVEMENT_CATEGORIES.forEach((category) => {
      expect(ACHIEVEMENTS.filter((a) => a.category === category.id).length, category.id).toBeGreaterThanOrEqual(5);
    });
    expect(new Set(ACHIEVEMENTS.map((a) => a.category)).size).toBe(5);
  });

  it('keeps the 36 new entries bilingual with a sane reward', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    NEW_IDS.forEach((id) => {
      const ach = ACHIEVEMENTS.find((a) => a.id === id);
      expect(ach, id).toBeDefined();
      expect(ach!.nameEn.trim().length, id).toBeGreaterThan(0);
      expect(ach!.descEn.trim().length, id).toBeGreaterThan(0);
      expect(Number.isInteger(ach!.reward) && ach!.reward > 0, id).toBe(true);
      expect(ach!.target, id).toBeGreaterThan(0);
      expect(ids.has(id), id).toBe(true);
    });
  });

  it('evaluates all 60 trackers on a fresh save and leaves the new ones unreached', () => {
    const snap = createNewGame('Fresh FC');
    ACHIEVEMENTS.forEach((a) => {
      const value = a.value(snap);
      expect(Number.isFinite(value), a.id).toBe(true);
      expect(value, a.id).toBeGreaterThanOrEqual(0);
    });
    NEW_IDS.forEach((id) => {
      const ach = ACHIEVEMENTS.find((a) => a.id === id)!;
      expect(ach.value(snap), id).toBeLessThan(ach.target);
    });
  });

  it('never throws when the optional save fields are missing', () => {
    const snap = createNewGame('Legacy FC');
    delete (snap as Partial<GameSnapshot>).tacticDefaults;
    delete (snap as Partial<GameSnapshot>).scoutReports;
    delete (snap as Partial<GameSnapshot>).coaches;
    delete (snap as Partial<GameSnapshot>).coachXp;
    ACHIEVEMENTS.forEach((a) => expect(Number.isFinite(a.value(snap)), a.id).toBe(true));
  });
});

describe('pillar 3 · dynasty milestones', () => {
  it('ships ten milestones with 5,000-30,000 coin rewards and bilingual copy', () => {
    expect(MILESTONES.length).toBe(10);
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(10);
    MILESTONES.forEach((m) => {
      expect(m.reward, m.id).toBeGreaterThanOrEqual(5000);
      expect(m.reward, m.id).toBeLessThanOrEqual(30000);
      expect(Number.isInteger(m.reward), m.id).toBe(true);
      expect(m.nameEn.trim().length, m.id).toBeGreaterThan(0);
      expect(m.descEn.trim().length, m.id).toBeGreaterThan(0);
    });
  });

  it('counts three consecutive MAJOR titles from the trophy cabinet', () => {
    const snap = createNewGame('Major FC');
    snap.career = {
      ...snap.career,
      honors: [
        { id: 'h1', name: '国家杯', tier: 3, wonAt: 10, prize: 9000 },
        { id: 'h2', name: 'MAJOR', tier: 9, wonAt: 20, prize: 60000 },
        { id: 'h3', name: 'MAJOR', tier: 9, wonAt: 30, prize: 60000 },
        { id: 'h4', name: 'MAJOR', tier: 9, wonAt: 40, prize: 60000 },
      ],
    };
    expect(maxConsecutiveMajors(snap)).toBe(3);
    const rows = milestoneRows(snap, []);
    expect(rows.find((r) => r.milestone.id === 'three-major')!.done).toBe(true);
    expect(rows.find((r) => r.milestone.id === 'ten-tiers')!.done).toBe(false);
  });

  it('keeps every milestone unreached on a fresh save', () => {
    const rows = milestoneRows(createNewGame('Fresh FC'), []);
    rows.forEach((row) => expect(row.done, row.milestone.id).toBe(false));
  });

  it('pays the reward once and records an achievement-style claim', () => {
    const snap = createNewGame('Milestone FC');
    seedStore({ club: { ...snap.club, level: 15 } });
    const before = useGameStore.getState().club.coins;

    const first = useGameStore.getState().claimMilestone('club-level15');
    expect(first.ok).toBe(true);
    const after = useGameStore.getState();
    expect(after.club.coins).toBe(before + 10000);
    expect(after.claimedAchievements).toContain(milestoneClaimId('club-level15'));

    const second = useGameStore.getState().claimMilestone('club-level15');
    expect(second.ok).toBe(false);
    expect(useGameStore.getState().club.coins).toBe(before + 10000);
  });

  it('refuses a milestone that has not been reached yet', () => {
    seedStore();
    const res = useGameStore.getState().claimMilestone('three-major');
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });
});

describe('pillar 3 · card albums', () => {
  it('builds team and nation albums from the existing card data', () => {
    const snap = createNewGame('Album FC');
    const albums = buildAlbums(snap);
    expect(albums.length).toBeGreaterThan(10);
    expect(albums.some((a) => a.kind === 'team')).toBe(true);
    expect(albums.some((a) => a.kind === 'country')).toBe(true);
    albums.forEach((album) => {
      expect(album.total, album.id).toBeGreaterThanOrEqual(3);
      expect(album.owned, album.id).toBeLessThanOrEqual(album.total);
      expect(album.entries.length, album.id).toBe(album.total);
    });
    expect(albums.filter((a) => a.complete).length).toBe(0);
    expect(albumSynergyBonus(snap)).toBe(0);
  });

  it('completes an album by owning every card in it', () => {
    const snap = createNewGame('Complete FC');
    const albums = buildAlbums(snap);
    const target = albums[0];
    const ownedIds = new Set(snap.cards.map((c) => c.templateId));
    target.entries.forEach((entry) => {
      if (!ownedIds.has(entry.templateId)) snap.cards.push(makeCard(entry.templateId, 1));
    });
    const rebuilt = buildAlbums(snap).find((a) => a.id === target.id)!;
    expect(rebuilt.complete).toBe(true);
    expect(albumSynergyBonus(snap)).toBeGreaterThan(0);
  });

  it('caps the permanent bonus and clamps the chemistry input', () => {
    const snap = createNewGame('Full Album FC');
    snap.cards = CARD_TEMPLATES.map((tpl) => makeCard(tpl.id, 1));
    const albums = buildAlbums(snap);
    expect(albums.every((a) => a.complete)).toBe(true);
    expect(albumSynergyBonus(snap)).toBe(ALBUM_BONUS_CAP);
    expect(ALBUM_BONUS_PER_ALBUM).toBe(0.5);
    expect(effectiveSynergy(100, ALBUM_BONUS_CAP)).toBe(SYNERGY.max);
  });

  it('feeds the bonus into the squad rating through the existing chemistry input', () => {
    // 同一套首发：只有「手里有多少卡」不同，所以默契加成的差别完全来自收藏册。
    const allCards = CARD_TEMPLATES.map((tpl) => makeCard(tpl.id, 1));
    const byTemplate = new Map(allCards.map((card) => [card.templateId, card]));
    const slots: GameSnapshot['squad']['slots'] = { AWPer: null, Entry: null, Lurker: null, Support: null, Anchor: null };
    COMBAT_ROLES.forEach((role) => {
      const tpl = CARD_TEMPLATES.find((t) => t.primaryRole === role && byTemplate.has(t.id));
      if (tpl) slots[role] = byTemplate.get(tpl.id)!.instanceId;
    });
    const squad = { slots, igl: slots.AWPer, synergy: 42, matchesTogether: 0 };
    const starters = COMBAT_ROLES.map((role) => slots[role])
      .filter((id): id is string => Boolean(id))
      .map((id) => allCards.find((card) => card.instanceId === id)!);

    seedStore({ cards: starters, squad });
    const plain = useGameStore.getState().squadRating();
    expect(plain.filled).toBe(5);
    expect(plain.synergy).toBe(42);

    useGameStore.setState({ cards: allCards });
    const boosted = useGameStore.getState().squadRating();
    expect(boosted.filled).toBe(5);
    expect(boosted.synergy).toBe(42 + ALBUM_BONUS_CAP);
    // 区间断言：首发评分必须落在合法区间，且收藏册加成只会抬高、不会压低默契输入。
    expect(plain.ovr).toBeGreaterThanOrEqual(85);
    expect(boosted.ovr).toBeLessThanOrEqual(99);
    expect(boosted.ovr).toBeGreaterThanOrEqual(plain.ovr);

    // 相对断言：同一套首发必须不弱于「同尺寸替补组合」——替补取同位置的下一位选手，
    // 这样即使卡池数值被重新校准，首发选择的优越性仍然成立。
    const starterIds = new Set(starters.map((card) => card.templateId));
    const benchSlots: GameSnapshot['squad']['slots'] = { ...slots };
    COMBAT_ROLES.forEach((role) => {
      const bench = CARD_TEMPLATES.find((t) => t.primaryRole === role && !starterIds.has(t.id));
      if (bench) benchSlots[role] = byTemplate.get(bench.id)!.instanceId;
    });
    useGameStore.setState({ cards: allCards, squad: { ...squad, slots: benchSlots, synergy: 42 } });
    const benchRating = useGameStore.getState().squadRating();
    expect(benchRating.filled).toBe(5);
    expect(boosted.ovr).toBeGreaterThanOrEqual(benchRating.ovr);
  });
});

describe('pillar 3 · career endings', () => {
  it('triggers nothing on a fresh save', () => {
    const snap = createNewGame('Fresh FC');
    expect(triggeredEndings(snap)).toEqual([]);
    expect(pendingEndings(snap, [])).toEqual([]);
  });

  it('triggers the bankruptcy ending on zero coins and a three-loss streak', () => {
    const snap = createNewGame('Broke FC');
    snap.club = { ...snap.club, coins: 0, streak: -3 };
    expect(triggeredEndings(snap).map((e) => e.id)).toContain('bankrupt');
  });

  it('triggers the dynasty, grand-slam and legend endings from existing fields', () => {
    const snap = createNewGame('Dynasty FC');
    snap.career = {
      ...snap.career,
      season: 10,
      titles: 6,
      honors: [
        ...Array.from({ length: 10 }, (_, i) => ({ id: 'tier-' + i, name: '赛事 ' + i, tier: i, wonAt: i, prize: 1000 })),
        { id: 'm1', name: 'MAJOR', tier: 9, wonAt: 100, prize: 60000 },
        { id: 'm2', name: 'MAJOR', tier: 9, wonAt: 101, prize: 60000 },
        { id: 'm3', name: 'MAJOR', tier: 9, wonAt: 102, prize: 60000 },
      ],
    };
    const ids = triggeredEndings(snap).map((e) => e.id);
    expect(ids).toContain('dynasty');
    expect(ids).toContain('sweep');
    expect(ids).toContain('legend');
    expect(ENDINGS.length).toBe(4);
  });

  it('records an ending once and keeps the loop running', () => {
    const snap = createNewGame('Broke FC');
    seedStore({ club: { ...snap.club, coins: 0, streak: -3 } });
    const res = useGameStore.getState().claimMilestone('bankrupt');
    expect(res.ok).toBe(true);
    expect(useGameStore.getState().claimedAchievements).toContain(endingClaimId('bankrupt'));
    expect(useGameStore.getState().claimMilestone('bankrupt').ok).toBe(false);
    expect(pendingEndings(useGameStore.getState().snapshot(), useGameStore.getState().claimedAchievements)).toEqual([]);
  });
});

describe('pillar 3 · hall of fame', () => {
  it('starts empty and documents that there are no retirement events', () => {
    seedStore();
    expect(buildHallOfFame(createNewGame('Hof FC'))).toEqual([]);
    const { container } = render(<MemoryRouter><HallOfFame /></MemoryRouter>);
    expect(container.textContent).toContain('收录口径');
    expect(container.textContent).toContain('退役事件');
  });

  it('includes an owned card whose data layer marks the player as retired', () => {
    const snap = createNewGame('Hof FC');
    snap.cards.push(makeCard('tpl-getright-2021', 1));
    const entries = buildHallOfFame(snap);
    const legend = entries.find((e) => e.name === 'GeT_RiGhT');
    expect(legend).toBeDefined();
    expect(legend!.reason).toBe('retired');
  });

  it('includes a historical starter that has left the lineup', () => {
    const snap = createNewGame('Hof FC');
    const bench = makeCard('tpl-zywoo-2026', 1);
    snap.cards.push(bench);
    snap.matches = [summary({ scoreboard: [statLine(bench.instanceId, 'ZywOo')] })];
    const entry = buildHallOfFame(snap).find((e) => e.id === 'player:zywoo');
    expect(entry).toBeDefined();
    expect(entry!.reason).toBe('former-starter');
    expect(entry!.metric).toBe(1);
  });

  it('includes a coach who left office after coaching', () => {
    const snap = createNewGame('Hof FC');
    const coach: OwnedCoach = { instanceId: 'coach-1', coachId: COACHES[0].id, xp: 200 };
    snap.coaches = [coach];
    snap.headCoachId = null;
    const entry = buildHallOfFame(snap).find((e) => e.id === 'coach:coach-1');
    expect(entry).toBeDefined();
    expect(entry!.reason).toBe('former-coach');
    expect(entry!.name).toBe(COACHES[0].nickname);
    expect(entry!.metric).toBe(200);
  });
});

describe('pillar 3 · panels render', () => {
  it('renders the achievements page with category chips and tab navigation', () => {
    seedStore();
    render(<MemoryRouter><AchievementsPage /></MemoryRouter>);
    expect(screen.getByRole('tab', { name: '成就' })).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: '里程碑' }));
    expect(screen.getByText('三连 MAJOR')).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: '成就' }));
    const chips = screen.getAllByRole('button', { pressed: false }).map((b) => b.textContent ?? '');
    expect(chips.some((text) => text.includes('彩蛋'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /彩蛋/ }));
    expect(screen.getByText('存钱罐')).toBeDefined();
  });

  it('renders the milestone, album and hall panels on their own', () => {
    seedStore();
    const milestone = render(<MemoryRouter><MilestonePanel /></MemoryRouter>);
    expect(milestone.container.textContent).toContain('王朝里程碑');
    milestone.unmount();

    const album = render(<MemoryRouter><AlbumPanel /></MemoryRouter>);
    expect(album.container.textContent).toContain('收藏册');
    album.unmount();

    const hall = render(<MemoryRouter><HallOfFame /></MemoryRouter>);
    expect(hall.container.textContent).toContain('名人堂');
  });

  it('hides the ending banner while no ending has triggered', () => {
    seedStore();
    const { container } = render(<MemoryRouter><EndingBanner /></MemoryRouter>);
    expect(container.textContent).toBe('');
  });

  it('shows the ending banner once an ending triggers', () => {
    const snap = createNewGame('Broke FC');
    seedStore({ club: { ...snap.club, coins: 0, streak: -3 } });
    const { container } = render(<MemoryRouter><EndingBanner /></MemoryRouter>);
    expect(container.textContent).toContain('破产清算');
    expect(container.textContent).toContain('继续游戏');
  });
});
