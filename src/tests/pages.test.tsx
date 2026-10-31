import { seasonEvents } from '@/game/calendar';
// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGameStore, type GameStore } from '@/stores/gameStore';
import { createNewGame } from '@/game/starter';
import { App } from '@/app/App';
import { DashboardPage } from '@/pages/DashboardPage';
import { CollectionPage } from '@/pages/CollectionPage';
import { SquadPage } from '@/pages/SquadPage';
import { PacksPage } from '@/pages/PacksPage';
import { TrainingPage } from '@/pages/TrainingPage';
import { MatchCenterPage } from '@/pages/MatchCenterPage';
import { CareerPage } from '@/pages/CareerPage';
import { RankingsPage } from '@/pages/RankingsPage';
import { RecordsPage } from '@/pages/RecordsPage';
import { SettingsPage } from '@/pages/SettingsPage';

function seedStore(overrides: Partial<GameStore> = {}) {
  const snap = createNewGame('UI Test Club');
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

function renderPage(node: React.ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

function expectRendered(container: HTMLElement, min = 40) {
  const text = (container.textContent ?? '').replace(/\s+/g, ' ').trim();
  expect(text.length).toBeGreaterThan(min);
}

afterEach(() => cleanup());

const PAGES: [string, () => React.ReactElement][] = [
  ['Dashboard', () => <DashboardPage />],
  ['Collection', () => <CollectionPage />],
  ['Squad', () => <SquadPage />],
  ['Packs', () => <PacksPage />],
  ['Training', () => <TrainingPage />],
  ['Match Center (setup)', () => <MatchCenterPage />],
  ['Career', () => <CareerPage />],
  ['Rankings', () => <RankingsPage />],
  ['Records', () => <RecordsPage />],
  ['Settings', () => <SettingsPage />],
];

describe('page rendering (no run-time errors)', () => {
  it.each(PAGES)('renders %s in a populated club', (_name, make) => {
    seedStore();
    const { container } = renderPage(make());
    expectRendered(container);
  });

  it.each(PAGES)('renders %s in a brand-new empty club', (_name, make) => {
    const snap = createNewGame('Empty Club');
    snap.cards = [];
    snap.matches = [];
    snap.tournaments = [];
    snap.prospects = [];
    snap.training = [];
    snap.squad = { slots: { AWPer: null, Entry: null, Lurker: null, Support: null, Anchor: null }, igl: null, synergy: 42, matchesTogether: 0 };
    useGameStore.setState({
      ready: true, hasGame: true, club: { ...snap.club, coins: 0 },
      cards: [], squad: snap.squad, pack: snap.pack, training: [], matches: [],
      prospects: [], leaders: snap.leaders, career: snap.career, tournaments: [],
      settings: snap.settings, tasks: snap.tasks, coinsLedger: snap.coinsLedger,
      customTemplates: [], customPlayers: [], activeMatch: null, activeMatchInfo: null,
      playerOrders: null, lastSummary: null, lastPackResults: null,
    });
    const { container } = renderPage(make());
    expect(container.textContent!.length).toBeGreaterThan(10);
  });

  it('renders the onboarding screen when no club exists', async () => {
    useGameStore.setState({ ready: true, hasGame: false });
    const { container } = render(<App />);
    expect(container.textContent).toContain('创建俱乐部');
  });

  it('renders the live match board with real engine state', () => {
    seedStore();
    const started = useGameStore.getState().startMatch({ mapId: 'Mirage', opponentId: 'liquid', mode: 'tactical' });
    expect(started.ok).toBe(true);
    useGameStore.getState().playNextRound();
    useGameStore.getState().playNextRound();
    const live = useGameStore.getState().activeMatch;
    expect(live).not.toBeNull();
    expect(live!.rounds.length).toBe(2);
    const { container } = renderPage(<MatchCenterPage />);
    const text = container.textContent ?? '';
    expect(text).toContain('UI Test Club');
    expect(text.length).toBeGreaterThan(200);
  });

  it('renders the post-match report after a quick simulation', () => {
    seedStore();
    useGameStore.getState().startMatch({ mapId: 'Inferno', opponentId: 'ence', mode: 'quick' });
    useGameStore.getState().autoPlay();
    expect(useGameStore.getState().lastSummary).not.toBeNull();
    const { container } = renderPage(<MatchCenterPage />);
    const text = container.textContent ?? '';
    expect(text.length).toBeGreaterThan(150);
    expect(text).toMatch(/MVP|计分板|返回|评分|赛后/);
  });

  it('renders a tournament bracket after entering a league', () => {
    seedStore();
    useGameStore.setState({ leaders: useGameStore.getState().leaders.map((l) => (l.id === 'player' ? { ...l, rating: 1500 } : l)) });
    const cal = seasonEvents(useGameStore.getState().club.season).find((e) => e.tier === 1)!;
    useGameStore.setState({ club: { ...useGameStore.getState().club, day: cal.day }, career: { ...useGameStore.getState().career, registeredEventIds: [cal.id] } });
    const entered = useGameStore.getState().startRegisteredEvent();
    expect(entered.ok).toBe(true);
    const { container } = renderPage(<CareerPage />);
    const text = container.textContent ?? '';
    expect(text.length).toBeGreaterThan(150);
    expect(text).toContain('UI Test Club');
  });

  it('shows pack results after a pull', () => {
    seedStore();
    useGameStore.setState({ club: { ...useGameStore.getState().club, coins: 20000 } });
    const results = useGameStore.getState().openPack(10);
    expect(results).not.toBeNull();
    expect(results!.length).toBe(10);
    const best = results!.some((r) => ['SR', 'SSR', 'UR'].includes(r.rarity));
    expect(best).toBe(true);
    const { container } = renderPage(<PacksPage />);
    expect(container.textContent!.length).toBeGreaterThan(100);
  });
});