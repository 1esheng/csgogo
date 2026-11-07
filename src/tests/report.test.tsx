// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { MatchEvent, MatchEventKind, MatchStatLine, MatchSummary, RoundRecord, Side } from '@/types';
import {
  MatchStats, economyProgression, finalSideOf, groupByTeam, halftimeRounds, keyRoundViewsFromSummary,
  keyRoundsOf, matchTarget, ourTeamId, scoreProgression, sidesByRound, sidesForReplay, teamTotals,
  type ReplayData,
} from '@/features/matches/MatchStats';
import { RoundReplay, buildRoundRows, killPairsOf } from '@/features/matches/RoundReplay';
import { MatchReportPage } from '@/pages/MatchReportPage';
import { useGameStore } from '@/stores/gameStore';
import { createNewGame } from '@/game/starter';
import { loadReplay } from '@/db/db';
import { RecordsPage } from '@/pages/RecordsPage';

let seq = 0;

function event(kind: MatchEventKind, over: Partial<MatchEvent> = {}): MatchEvent {
  seq += 1;
  return { id: 'ev' + seq, round: 1, clock: 100, kind, text: '', ...over };
}

function roundRecord(over: Partial<RoundRecord> & { roundNumber: number }): RoundRecord {
  return {
    winner: 'T',
    reason: 'elimination',
    scoreT: over.roundNumber,
    scoreCT: 0,
    bombPlanted: false,
    events: [],
    economy: { t: 1000, ct: 2000 },
    mvpCardId: null,
    wentToOvertime: false,
    ...over,
  };
}

function statLine(over: Partial<MatchStatLine> & { nickname: string }): MatchStatLine {
  const base: MatchStatLine = {
    cardInstanceId: 'card-' + over.nickname,
    playerId: 'player-' + over.nickname,
    nickname: over.nickname,
    teamId: 'player',
    side: 'T',
    kills: 0,
    deaths: 0,
    assists: 0,
    adr: 0,
    kast: 0,
    kd: 0,
    rating: 1,
    openingKills: 0,
    openingDeaths: 0,
    multiKills: 0,
    clutches: 0,
    damage: 0,
    rounds: 20,
  };
  return { ...base, ...over };
}

const LINES: MatchStatLine[] = [
  statLine({ nickname: 'alpha', kills: 20, deaths: 10, assists: 5, damage: 2000, adr: 100, rating: 1.31, kast: 72, kd: 2 }),
  statLine({ nickname: 'beta', kills: 10, deaths: 15, assists: 3, damage: 1000, adr: 50, rating: 0.92, kast: 61, kd: 0.67 }),
  statLine({ nickname: 'gamma', teamId: 'liquid', side: 'CT', kills: 12, deaths: 12, assists: 2, damage: 1200, adr: 60, rating: 1.02, kast: 66, kd: 1 }),
];

function summaryOf(over: Partial<MatchSummary> = {}): MatchSummary {
  return {
    id: 'm1',
    playedAt: Date.UTC(2024, 0, 2, 3, 4),
    mapId: 'Mirage',
    opponentName: '对手队',
    teamName: '我方队',
    scoreFor: 3,
    scoreAgainst: 0,
    won: true,
    roundsPlayed: 3,
    seed: 7,
    scoreboard: LINES,
    mvp: LINES[0],
    coins: 100,
    xp: 10,
    keyRounds: [],
    mode: 'quick',
    ...over,
  };
}

const ROUNDS: RoundRecord[] = [
  roundRecord({ roundNumber: 1, winner: 'T', scoreT: 1, scoreCT: 0 }),
  roundRecord({ roundNumber: 2, winner: 'CT', scoreT: 1, scoreCT: 1 }),
  roundRecord({ roundNumber: 3, winner: 'CT', scoreT: 1, scoreCT: 2, bombPlanted: true, reason: 'defuse' }),
];

function replayOf(rounds: RoundRecord[], events: MatchEvent[] = []): ReplayData {
  return { id: 'm1', at: 0, mapId: 'Mirage', result: '3:0', events, rounds };
}

afterEach(() => cleanup());

describe('赛后统计（纯函数）', () => {
  it('按 teamId 分组，并用计分板字段精确算出 K/D/A 与队伍 ADR', () => {
    expect(ourTeamId(LINES)).toBe('player');
    const groups = groupByTeam(LINES);
    expect(groups.map((group) => group.teamId)).toEqual(['player', 'liquid']);
    expect(groups[0].lines.map((line) => line.nickname)).toEqual(['alpha', 'beta']);
    expect(groups[1].lines.map((line) => line.nickname)).toEqual(['gamma']);
    const totals = teamTotals(groups[0].lines);
    expect(totals.kills).toBe(30);
    expect(totals.deaths).toBe(25);
    expect(totals.assists).toBe(8);
    expect(totals.damage).toBe(3000);
    expect(totals.rounds).toBe(20);
    expect(totals.players).toBe(2);
    expect(totals.adr).toBe(150);
    expect(totals.kd).toBe(1.2);
  });

  it('用 halftime 事件还原每回合阵营，并换算我方 / 对手累计比分与经济', () => {
    const events = [event('halftime', { round: 2 }), event('halftime', { round: 2 })];
    expect(halftimeRounds(events)).toEqual([2]);
    const sides = sidesByRound(ROUNDS, [2], 'CT');
    expect(sides).toEqual(['T', 'CT', 'CT']);
    expect(scoreProgression(ROUNDS, sides).map((p) => [p.roundNumber, p.ours, p.theirs])).toEqual([
      [1, 1, 0],
      [2, 1, 1],
      [3, 2, 1],
    ]);
    expect(economyProgression(ROUNDS, sides).map((p) => [p.ours, p.theirs])).toEqual([
      [1000, 2000],
      [2000, 1000],
      [2000, 1000],
    ]);
  });

  it('关键回合只由引擎字段定位：ACE / 残局 / 安包 / 赛点 / 决胜', () => {
    const rounds: RoundRecord[] = [
      roundRecord({ roundNumber: 1, winner: 'T', scoreT: 1, scoreCT: 0, events: [event('opening', { actor: 'A', victim: 'B' })] }),
      roundRecord({ roundNumber: 2, winner: 'T', scoreT: 2, scoreCT: 0, events: [event('multi', { text: 'alpha 本回合打出五杀 ACE（5 杀）。' })] }),
      roundRecord({
        roundNumber: 3,
        winner: 'T',
        scoreT: 3,
        scoreCT: 0,
        bombPlanted: true,
        events: [event('clutch'), event('plant')],
      }),
    ];
    const sides: Side[] = ['T', 'T', 'T'];
    const rows = keyRoundsOf(rounds, sides, { target: 3 });
    expect(rows.map((row) => row.roundNumber)).toEqual([2, 3]);
    expect(rows[0].tags).toEqual(['ace']);
    expect(rows[1].tags).toContain('clutch');
    expect(rows[1].tags).toContain('plant');
    expect(rows[1].tags).toContain('matchpoint');
    expect(rows[1].tags).toContain('deciding');
    expect(rows[1].ours).toBe(3);
    expect(rows[1].theirs).toBe(0);
  });

  it('目标分由最终比分反推：13 / 16 / 19', () => {
    expect(matchTarget([])).toBe(13);
    expect(matchTarget([roundRecord({ roundNumber: 1, scoreT: 13, scoreCT: 8 })])).toBe(13);
    expect(matchTarget([roundRecord({ roundNumber: 1, scoreT: 16, scoreCT: 14 })])).toBe(16);
    expect(matchTarget([roundRecord({ roundNumber: 1, scoreT: 19, scoreCT: 17 })])).toBe(19);
  });

  it('击杀序列只取真正产生 victim 的 duel / opening 事件', () => {
    const round = roundRecord({
      roundNumber: 4,
      events: [
        event('duel', { actor: 'A', victim: 'B', clock: 90 }),
        event('duel', { actor: 'C', clock: 80 }),
        event('opening', { actor: 'D', victim: 'E', clock: 100 }),
      ],
    });
    const kills = killPairsOf(round.events);
    expect(kills.map((kill) => kill.killer + '>' + kill.victim)).toEqual(['A>B', 'D>E']);
    expect(kills[0].opening).toBe(false);
    expect(kills[1].opening).toBe(true);
    const rows = buildRoundRows([round], ['CT']);
    expect(rows).toHaveLength(1);
    expect(rows[0].kills).toHaveLength(2);
    expect(rows[0].ours).toBe(0);
    expect(rows[0].theirs).toBe(4);
  });

  it('空数据不崩，也不编造', () => {
    expect(groupByTeam([])).toEqual([]);
    expect(ourTeamId([])).toBeNull();
    expect(teamTotals([])).toMatchObject({ kills: 0, deaths: 0, assists: 0, damage: 0, rounds: 0, adr: 0, kd: 0, players: 0 });
    expect(keyRoundsOf([], [])).toEqual([]);
    expect(scoreProgression([], [])).toEqual([]);
    expect(economyProgression([], [])).toEqual([]);
    expect(sidesByRound([], [], 'T')).toEqual([]);
    expect(killPairsOf([])).toEqual([]);
    expect(buildRoundRows([])).toEqual([]);
    expect(sidesForReplay(null, null)).toEqual([]);
    expect(finalSideOf(null)).toBeNull();
    expect(keyRoundViewsFromSummary(summaryOf({ keyRounds: [] }))).toEqual([]);
    const replay = replayOf(ROUNDS, [event('halftime', { round: 2 })]);
    expect(sidesForReplay(summaryOf(), replay)).toEqual(['CT', 'T', 'T']);
    const ctSummary = summaryOf({ scoreboard: LINES.map((line) => ({ ...line, side: 'CT' as Side })) });
    expect(sidesForReplay(ctSummary, replay)).toEqual(['T', 'CT', 'CT']);
  });
});

describe('赛后页面渲染', () => {
  it('数据站渲染双方队名、比分、选手表与关键回合', () => {
    const { container } = render(
      <MemoryRouter>
        <MatchStats summary={summaryOf()} replay={replayOf(ROUNDS, [event('halftime', { round: 2 })])} />
      </MemoryRouter>,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('我方队');
    expect(text).toContain('对手队');
    expect(text).toContain('选手计分板');
    expect(text).toContain('关键回合');
    expect(text).toContain('alpha');
    expect(text).toContain('gamma');
    expect(text).toContain('以下指标没有显示');
    expect(container.querySelectorAll('table')).toHaveLength(2);
  });

  it('没有回放时回放区给出说明而不是崩溃', () => {
    const { container } = render(
      <MemoryRouter>
        <div>
          <MatchStats summary={summaryOf()} replay={null} />
          <RoundReplay replay={null} />
        </div>
      </MemoryRouter>,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('没有可用的回放。');
    expect(text).toContain('回放缺失，关键回合改用战绩摘要里的引擎标记。');
  });

  it('回放列表按回合渲染，展开后显示击杀序列', () => {
    const rounds = [
      roundRecord({ roundNumber: 1, events: [event('duel', { actor: 'alpha', victim: 'gamma', clock: 88 })] }),
      roundRecord({ roundNumber: 2, scoreT: 2, events: [] }),
    ];
    const { container } = render(
      <MemoryRouter>
        <RoundReplay replay={replayOf(rounds)} sides={['T', 'T']} />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('button')).toHaveLength(2);
    expect(container.textContent).toContain('1 K');
  });

  it('报告页按 id 找到比赛摘要，找不到时给空状态', () => {
    const snapshot = createNewGame('Report Test Club');
    useGameStore.setState({
      ready: true,
      hasGame: true,
      club: snapshot.club,
      cards: snapshot.cards,
      squad: snapshot.squad,
      settings: snapshot.settings,
      matches: [summaryOf({ id: 'm-report' })],
    });
    const renderReport = (path: string) => render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path='/report/:id' element={<MatchReportPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const found = renderReport('/report/m-report');
    const text = found.container.textContent ?? '';
    expect(text).toContain('赛后数据站');
    expect(text).toContain('对手队');
    expect(text).toContain('对局回放');
    cleanup();

    const missing = renderReport('/report/does-not-exist');
    expect(missing.container.textContent).toContain('找不到这场比赛的摘要');
  });

  it('战绩页的「查看数据」入口跳转到该场报告', () => {
    const snapshot = createNewGame('Records Entry Club');
    useGameStore.setState({
      ready: true, hasGame: true, club: snapshot.club, cards: snapshot.cards,
      squad: snapshot.squad, settings: snapshot.settings, matches: [summaryOf({ id: 'm-entry' })],
    });
    const { container } = render(
      <MemoryRouter initialEntries={['/records']}>
        <Routes>
          <Route path='/records' element={<RecordsPage />} />
          <Route path='/report/:id' element={<MatchReportPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const row = container.querySelector('button');
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLButtonElement);
    expect(document.body.textContent).toContain('查看数据');
    fireEvent.click(screen.getByText('查看数据'));
    expect(document.body.textContent).toContain('赛后数据站');
  });

  it('真实引擎对局：回放里的击杀总数等于计分板的阵亡总数', async () => {
    const snapshot = createNewGame('Replay Test Club');
    useGameStore.setState({
      ready: true, hasGame: true, club: snapshot.club, cards: snapshot.cards,
      squad: snapshot.squad, settings: snapshot.settings, matches: [],
    });
    expect(useGameStore.getState().startMatch({ mapId: 'Mirage', opponentId: 'liquid', mode: 'quick' }).ok).toBe(true);
    useGameStore.getState().autoPlay();
    const summary = useGameStore.getState().lastSummary;
    expect(summary).not.toBeNull();
    const matchId = summary ? summary.id : '';
    let row = await loadReplay(matchId);
    for (let i = 0; i < 40 && !row; i += 1) {
      await new Promise((resolve) => { setTimeout(resolve, 5); });
      row = await loadReplay(matchId);
    }
    expect(row).toBeDefined();
    const rounds = row ? row.rounds : [];
    expect(rounds.length).toBe(summary ? summary.roundsPlayed : 0);
    const kills = rounds.reduce((acc, record) => acc + killPairsOf(record.events).length, 0);
    const deaths = summary ? summary.scoreboard.reduce((acc, line) => acc + line.deaths, 0) : -1;
    expect(kills).toBe(deaths);
    const replay = row
      ? { id: row.id, at: row.at, mapId: row.mapId, result: row.result, events: row.events, rounds: row.rounds }
      : null;
    expect(sidesForReplay(summary, replay)).toHaveLength(rounds.length);
    expect(keyRoundsOf(rounds, sidesForReplay(summary, replay)).length).toBeGreaterThan(0);
  });
});
