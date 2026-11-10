// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { AI_TEAMS } from '@/data/aiTeams';
import { clearDatabase, loadSave } from '@/db/db';
import { parseSaveFile } from '@/db/save';
import { aiTeamOvr } from '@/engine/lineup';
import { buildScoutIntel, OpponentScout, priceLabel } from '@/features/matches/ScoutReport';
import {
  applyCoachMorale, CLUTCH_META, COACH_MORALE_BUFF, MATCH_TACTICS_LIMITS, scoutPrice, SCOUT_PRICE_RANGE, useGameStore,
} from '@/stores/gameStore';

const OPPONENT = AI_TEAMS[0];
const WEAKEST = AI_TEAMS.reduce((a, b) => (aiTeamOvr(a) <= aiTeamOvr(b) ? a : b));
const STRONGEST = AI_TEAMS.reduce((a, b) => (aiTeamOvr(a) >= aiTeamOvr(b) ? a : b));

async function freshClub(): Promise<void> {
  await clearDatabase();
  await useGameStore.getState().newGame('Scout Test');
  useGameStore.setState({
    activeMatch: null, activeMatchInfo: null, playerOrders: null, lastSummary: null, scoutReports: {},
  });
}

function setCoins(coins: number): void {
  const state = useGameStore.getState();
  useGameStore.setState({ club: { ...state.club, coins } });
}

function startMatch(): void {
  const result = useGameStore.getState().startMatch({ mapId: 'Mirage', opponentId: OPPONENT.id, mode: 'quick' });
  expect(result.ok).toBe(true);
}

describe('scout report pricing', () => {
  it('价格落在 8,000–30,000，随对手实力与 career 档位单调不减', () => {
    // 价格口径由公式自身定义（基准 8,000 + 强度差*800 + 档位差*1200，取整到 100，夹在区间内）。
    // 卡池数值由真实数据校准后，这里不再硬编码具体金额，而是重新推导一遍公式来核对实现。
    const STRENGTH_BASE = 70;
    const derive = (spec: typeof OPPONENT, tier: number) => {
      const strengthDelta = Math.max(0, aiTeamOvr(spec) - STRENGTH_BASE);
      const tierDelta = Math.max(0, Math.round(Number.isFinite(tier) ? tier : 0));
      const raw = SCOUT_PRICE_RANGE.min + strengthDelta * 800 + tierDelta * 1200;
      const rounded = Math.round(raw / 100) * 100;
      return Math.min(SCOUT_PRICE_RANGE.max, Math.max(SCOUT_PRICE_RANGE.min, rounded));
    };

    const noLineup = { ...OPPONENT, lineup: [] };
    expect(SCOUT_PRICE_RANGE).toEqual({ min: 8000, max: 30000 });
    // 空阵容 = 强度差为 0，直接落在下限
    expect(scoutPrice(noLineup, 0)).toBe(SCOUT_PRICE_RANGE.min);
    expect(scoutPrice(noLineup, 3)).toBe(derive(noLineup, 3));
    expect(scoutPrice(STRONGEST, 9)).toBe(derive(STRONGEST, 9));
    expect(scoutPrice(STRONGEST, 9)).toBe(SCOUT_PRICE_RANGE.max);

    // 同一档位下，越强的对手不会更便宜
    const byStrength = [...AI_TEAMS].sort((a, b) => aiTeamOvr(a) - aiTeamOvr(b));
    for (let i = 1; i < byStrength.length; i += 1) {
      expect(scoutPrice(byStrength[i], 2)).toBeGreaterThanOrEqual(scoutPrice(byStrength[i - 1], 2));
    }
    // 同一对手下，档位越高不会更便宜
    for (let tier = 1; tier <= 9; tier += 1) {
      expect(scoutPrice(WEAKEST, tier)).toBeGreaterThanOrEqual(scoutPrice(WEAKEST, tier - 1));
    }
    // 真实对手池：价格恒等于公式推导值，且必定落在区间内、取整到 100
    for (const spec of [noLineup, WEAKEST, STRONGEST, OPPONENT]) {
      for (const tier of [0, 1, 3, 5, 9]) {
        const price = scoutPrice(spec, tier);
        expect(price).toBe(derive(spec, tier));
        expect(price).toBeGreaterThanOrEqual(SCOUT_PRICE_RANGE.min);
        expect(price).toBeLessThanOrEqual(SCOUT_PRICE_RANGE.max);
        expect(price % 100).toBe(0);
      }
    }
    // 最弱与最强的价差必须真实存在，否则上面的区间断言会退化成永远成立
    expect(scoutPrice(STRONGEST, 0)).toBeGreaterThan(scoutPrice(WEAKEST, 0));
  });

  it('购买情报扣款金额与显示价格一致，同一对手只扣一次，并写进存档', async () => {
    await freshClub();
    setCoins(40000);
    const price = scoutPrice(OPPONENT, useGameStore.getState().career.tier);

    expect(useGameStore.getState().buyScoutReport(OPPONENT.id).ok).toBe(true);
    expect(useGameStore.getState().club.coins).toBe(40000 - price);

    const stamp = useGameStore.getState().scoutReports[OPPONENT.id];
    expect(typeof stamp).toBe('number');
    expect(stamp).toBeGreaterThan(0);

    expect(useGameStore.getState().buyScoutReport(OPPONENT.id).ok).toBe(false);
    expect(useGameStore.getState().club.coins).toBe(40000 - price);

    await useGameStore.getState().saveNow();
    const saved = await loadSave();
    expect(saved?.scoutReports?.[OPPONENT.id]).toBe(stamp);
  });

  it('金币不足时不出售，也不扣钱', async () => {
    await freshClub();
    const price = scoutPrice(OPPONENT, useGameStore.getState().career.tier);
    setCoins(price - 1);
    expect(useGameStore.getState().buyScoutReport(OPPONENT.id).ok).toBe(false);
    expect(useGameStore.getState().club.coins).toBe(price - 1);
    expect(useGameStore.getState().scoutReports[OPPONENT.id]).toBeUndefined();
  });

  it('未购买只给免费风格标签与价格，购买后才显示具体倾向', async () => {
    await freshClub();
    setCoins(60000);
    const intel = buildScoutIntel(OPPONENT);
    const topPlayer = intel.roster[0];
    const price = scoutPrice(OPPONENT, useGameStore.getState().career.tier);
    const view = render(<OpponentScout spec={OPPONENT} />);

    const teaser = view.container.textContent ?? '';
    expect(teaser).toContain('风格');
    expect(teaser).toContain('永久解锁');
    expect(teaser).toContain(priceLabel(price));
    expect(teaser).not.toContain('经济风格');
    expect(teaser).not.toContain(intel.econLine);
    expect(teaser).not.toContain(intel.mapNames[0]);
    expect(teaser).not.toContain(intel.adaptivityLine);
    expect(teaser).not.toContain(topPlayer.nickname);

    fireEvent.click(view.getByRole('button'));

    const report = view.container.textContent ?? '';
    expect(report).toContain('侦察报告');
    expect(report).toContain('经济风格');
    expect(report).toContain(intel.econLine);
    expect(report).toContain(intel.mapNames[0]);
    expect(report).toContain(intel.adaptivityLine);
    expect(report).toContain(topPlayer.nickname);
    expect(report).toContain(String(intel.averageOvr));
    expect(useGameStore.getState().club.coins).toBe(60000 - price);
    cleanup();
  });

  it('金币不足时按钮禁用并写明还差多少', async () => {
    await freshClub();
    const price = scoutPrice(OPPONENT, useGameStore.getState().career.tier);
    setCoins(1000);
    const view = render(<OpponentScout spec={OPPONENT} />);
    const text = view.container.textContent ?? '';
    expect(text).toContain('金币不足，还差 ');
    expect(text).toContain(priceLabel(price - 1000));
    const button = view.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(useGameStore.getState().club.coins).toBe(1000);
    cleanup();
  });

  it('旧存档没有 scoutReports 字段时按空对象兜底', async () => {
    await freshClub();
    const legacy = { ...useGameStore.getState().snapshot() } as Record<string, unknown>;
    delete legacy.scoutReports;
    const json = JSON.stringify(legacy);
    expect(parseSaveFile(json).ok).toBe(true);
    expect((await useGameStore.getState().importSave(json)).ok).toBe(true);
    expect(useGameStore.getState().scoutReports).toEqual({});
  });
});

describe('timeouts and coach boost', () => {
  it('暂停每场最多 2 次，新比赛重新计数', async () => {
    await freshClub();
    startMatch();
    expect(useGameStore.getState().requestPause().ok).toBe(true);
    expect(useGameStore.getState().requestPause().ok).toBe(true);
    expect(useGameStore.getState().requestPause().ok).toBe(false);
    expect(useGameStore.getState().matchTactics.pausesUsed).toBe(MATCH_TACTICS_LIMITS.pauses);

    startMatch();
    expect(useGameStore.getState().matchTactics.pausesUsed).toBe(0);
  });

  it('教练鼓舞只作用一回合，回合结束后属性原样还原', async () => {
    await freshClub();
    startMatch();
    const before = useGameStore.getState().activeMatch!.teams.A.players.map((p) => ({ ...p.attributes }));

    expect(useGameStore.getState().coachBoost().ok).toBe(true);
    expect(useGameStore.getState().matchTactics.coachBoostArmed).toBe(true);
    expect(useGameStore.getState().coachBoost().ok).toBe(false);

    useGameStore.getState().playNextRound();
    const after = useGameStore.getState();
    expect(after.matchTactics.coachBoostArmed).toBe(false);
    expect(after.matchTactics.coachBoostsUsed).toBe(MATCH_TACTICS_LIMITS.coachBoosts);
    expect(after.activeMatch!.teams.A.players.map((p) => ({ ...p.attributes }))).toEqual(before);

    const first = after.activeMatch!.rounds[after.activeMatch!.rounds.length - 1];
    expect(first.events.map((e) => e.text).join(' | ')).toContain('教练鼓舞');

    useGameStore.getState().playNextRound();
    const next = useGameStore.getState();
    const second = next.activeMatch!.rounds[next.activeMatch!.rounds.length - 1];
    expect(second.events.map((e) => e.text).join(' | ')).not.toContain('教练鼓舞');
  });

  it('applyCoachMorale 抬高一次后能精确还原', async () => {
    await freshClub();
    startMatch();
    const team = useGameStore.getState().activeMatch!.teams.A;
    const before = team.players.map((p) => ({ ...p.attributes }));
    const restore = applyCoachMorale(team);
    expect(team.players[0].attributes.aim).toBe(Math.round(before[0].aim * (1 + COACH_MORALE_BUFF)));
    restore();
    expect(team.players.map((p) => ({ ...p.attributes }))).toEqual(before);
  });
});

describe('late-round decisions', () => {
  it('保枪 / 强起 / 换点各自给出说明并写进本回合日志，且只影响一回合', async () => {
    for (const decision of ['save', 'force', 'rotate'] as const) {
      await freshClub();
      startMatch();
      const note = CLUTCH_META[decision].note;

      useGameStore.getState().setClutchDecision(decision);
      expect(useGameStore.getState().matchTactics.clutch).toBe(decision);
      expect(useGameStore.getState().matchTactics.clutchNote).toBe(note);

      const orders = useGameStore.getState().playerOrders!;
      if (decision === 'save') expect(orders.buy).toBe('eco');
      if (decision === 'force') expect(orders.buy).toBe('force');
      if (decision === 'rotate') expect(orders.target).toBe('A');

      useGameStore.getState().playNextRound();
      const played = useGameStore.getState();
      const round = played.activeMatch!.rounds[played.activeMatch!.rounds.length - 1];
      expect(round.events.map((e) => e.text)).toContain(note);
      expect(played.matchTactics.clutch).toBeNull();
      expect(played.matchTactics.clutchNote).toBeNull();

      useGameStore.getState().playNextRound();
      const later = useGameStore.getState();
      const nextRound = later.activeMatch!.rounds[later.activeMatch!.rounds.length - 1];
      expect(nextRound.events.map((e) => e.text)).not.toContain(note);
    }
  });
});
