// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AI_TEAM_MAP } from '@/data/aiTeams';
import { TEAM_LOGOS, logoCount, logoFor } from '@/data/teamLogos';
import { TeamLogo } from '@/components/TeamLogo';
import { useGameStore, type GameStore } from '@/stores/gameStore';
import { createNewGame } from '@/game/starter';
import { RankingsPage } from '@/pages/RankingsPage';

afterEach(() => cleanup());

const logoSrcs = Object.values(TEAM_LOGOS).filter((v): v is string => typeof v === 'string');

describe('team logos assets', () => {
  it('只登记 aiTeams 里真实存在的战队 id', () => {
    const ids = Object.keys(TEAM_LOGOS);
    expect(ids.length).toBeGreaterThan(0);
    ids.forEach((id) => expect(AI_TEAM_MAP[id], id).toBeTruthy());
    expect(TEAM_LOGOS.player).toBeUndefined();
  });

  it('每张队标都是打包进构建的本地资源，不是外链', () => {
    expect(logoSrcs.length).toBe(Object.keys(TEAM_LOGOS).length);
    logoSrcs.forEach((src) => {
      expect(src).not.toMatch(/^https?:/);
      expect(src).toMatch(/\.(png|jpe?g|webp|svg)(\?|$)/i);
    });
  });

  it('多数真实战队已覆盖队标，缺失的由默认方标兜底', () => {
    expect(logoCount()).toBeGreaterThanOrEqual(50);
    expect(logoFor('navi')).toBeTruthy();
    expect(logoFor('player')).toBeNull();
    expect(logoFor(null)).toBeNull();
  });
});

describe('TeamLogo', () => {
  it('有图时渲染 img，20-24px、rounded、object-contain', () => {
    const teamId = Object.keys(TEAM_LOGOS)[0];
    const name = AI_TEAM_MAP[teamId].name;
    const { container } = render(<TeamLogo teamId={teamId} name={name} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('alt')).toContain(name);
    expect(img!.className).toContain('rounded');
    expect(img!.className).toContain('object-contain');
    const width = Number(img!.getAttribute('width'));
    expect(width).toBeGreaterThanOrEqual(20);
    expect(width).toBeLessThanOrEqual(24);
  });

  it('没有图时渲染首字母方标（ink-700 + white/10 + text-txt-muted），不借用别的队', () => {
    const { container } = render(<TeamLogo teamId='unlisted-xyz' name='我的俱乐部' />);
    expect(container.querySelector('img')).toBeNull();
    const badge = container.querySelector('[role="img"]');
    expect(badge).not.toBeNull();
    expect(badge!.className).toContain('bg-ink-700');
    expect(badge!.className).toContain('border-white/10');
    expect(badge!.className).toContain('text-txt-muted');
    expect(badge!.textContent?.length).toBe(1);
    expect(badge!.getAttribute('aria-label')).toContain('我的俱乐部');
  });
});

describe('RankingsPage 队标接线', () => {
  it('积分榜每一行都有一个队标（真实图或默认方标）', () => {
    const snap = createNewGame('Logo UI Club');
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
    } as Partial<GameStore>);

    const { container } = render(
      <MemoryRouter>
        <RankingsPage />
      </MemoryRouter>,
    );

    const marks = container.querySelectorAll('img[alt^="队标"], span[role="img"]');
    expect(marks.length).toBe(snap.leaders.length);
    const realLogos = container.querySelectorAll('img[alt^="队标"]');
    expect(realLogos.length).toBeGreaterThan(0);
  });
});

  it('玩家俱乐部使用本作品牌标志', () => {
    const { container } = render(<TeamLogo teamId='player' name='Dynasty' />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('alt')).toContain('Dynasty');
  });
});
