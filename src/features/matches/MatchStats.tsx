import { useMemo } from 'react';
import clsx from 'clsx';
import { Crown } from 'lucide-react';
import type { MapId, MatchEvent, MatchStatLine, MatchSummary, RoundRecord, Side } from '@/types';
import { REASON_LABEL } from '@/data/config';
import { MAPS } from '@/data/maps';
import { Panel } from '@/components/ui';
import { useT } from '@/hooks/useLang';
import { MODE_LABEL } from '@/features/career/RecordDetail';
import { moneyLabel } from './matchUi';

/**
 * 回放行结构。字段与 db/db.ts 的 ReplayRow 完全一致，但这里用结构类型，
 * 让统计/时间线保持纯函数，测试不需要碰 IndexedDB。
 */
export interface ReplayData {
  id: string;
  at: number;
  mapId: MapId;
  result: string;
  events: MatchEvent[];
  rounds: RoundRecord[];
}

/** 引擎把玩家队伍固定写成 teamId 'player'（见 createMatch 的 teamA.id）。 */
export const PLAYER_TEAM_ID = 'player';

export interface TeamGroup {
  teamId: string;
  lines: MatchStatLine[];
}

/** 按 teamId 分组，保留首次出现顺序（buildScoreboard 按评分排序，不能靠数组下标分组）。 */
export function groupByTeam(lines: MatchStatLine[]): TeamGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, MatchStatLine[]>();
  lines.forEach((line) => {
    const bucket = buckets.get(line.teamId);
    if (bucket) {
      bucket.push(line);
      return;
    }
    buckets.set(line.teamId, [line]);
    order.push(line.teamId);
  });
  return order.map((teamId) => ({
    teamId,
    lines: [...(buckets.get(teamId) ?? [])].sort((a, b) => b.rating - a.rating),
  }));
}

/** 我方 teamId：优先 'player'，否则退回第一条记录所属队伍。 */
export function ourTeamId(lines: MatchStatLine[]): string | null {
  if (lines.some((line) => line.teamId === PLAYER_TEAM_ID)) return PLAYER_TEAM_ID;
  return lines.length > 0 ? lines[0].teamId : null;
}

export interface TeamTotals {
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  rounds: number;
  adr: number;
  kd: number;
  players: number;
}

/** 队伍汇总：全部由 MatchStatLine 的字段相加得出，不推断任何缺失字段。 */
export function teamTotals(lines: MatchStatLine[]): TeamTotals {
  const sum = (pick: (line: MatchStatLine) => number): number => lines.reduce((acc, line) => acc + pick(line), 0);
  const kills = sum((line) => line.kills);
  const deaths = sum((line) => line.deaths);
  const assists = sum((line) => line.assists);
  const damage = sum((line) => line.damage);
  const rounds = lines.reduce((acc, line) => Math.max(acc, line.rounds), 0);
  return {
    kills,
    deaths,
    assists,
    damage,
    rounds,
    adr: rounds > 0 ? Math.round((damage / rounds) * 10) / 10 : 0,
    kd: Math.round((kills / Math.max(1, deaths)) * 100) / 100,
    players: lines.length,
  };
}

/** 回放事件里的半场/加时换边点：事件 round 是换边后开始的那一回合。 */
export function halftimeRounds(events: MatchEvent[]): number[] {
  const rounds = new Set<number>();
  events.forEach((event) => {
    if (event.kind === 'halftime') rounds.add(event.round);
  });
  return Array.from(rounds).sort((a, b) => a - b);
}

/**
 * 还原每回合各方所在阵营。finalSide 是该队伍的比赛结束阵营（MatchStatLine.side）。
 * 换边事件发生在第 r 回合之前时，第 r 回合及之后的阵营都被翻转，因此第 k 回合
 * 的翻转次数 = 严格大于 k 的换边事件数（与 engine/match.ts 的 swapSides 顺序一致）。
 */
export function sidesByRound(rounds: RoundRecord[], swaps: number[], finalSide: Side): Side[] {
  return rounds.map((round) => {
    const flips = swaps.filter((swap) => swap > round.roundNumber).length;
    if (flips % 2 === 0) return finalSide;
    return finalSide === 'T' ? 'CT' : 'T';
  });
}

export interface RoundScore {
  roundNumber: number;
  /** 我方在该回合结束后的累计胜场。 */
  ours: number;
  /** 对手在该回合结束后的累计胜场。 */
  theirs: number;
  /** 引擎原始阵营比分（RoundRecord.scoreT / scoreCT）。 */
  sideT: number;
  sideCT: number;
}

export function scoreProgression(rounds: RoundRecord[], sides: Side[]): RoundScore[] {
  return rounds.map((round, index) => {
    const side = sides[index] ?? 'T';
    const ours = side === 'T' ? round.scoreT : round.scoreCT;
    const theirs = side === 'T' ? round.scoreCT : round.scoreT;
    return { roundNumber: round.roundNumber, ours, theirs, sideT: round.scoreT, sideCT: round.scoreCT };
  });
}

export interface RoundBank {
  roundNumber: number;
  ours: number;
  theirs: number;
}

/** 回合结束时的双方剩余总资金（RoundRecord.economy），按该回合阵营映射。 */
export function economyProgression(rounds: RoundRecord[], sides: Side[]): RoundBank[] {
  return rounds.map((round, index) => {
    const side = sides[index] ?? 'T';
    return {
      roundNumber: round.roundNumber,
      ours: side === 'T' ? round.economy.t : round.economy.ct,
      theirs: side === 'T' ? round.economy.ct : round.economy.t,
    };
  });
}

/**
 * 结束这场比赛的分数。规整局是 13；加时每多打一段 +3（engine/match.ts targetScore）。
 * 用最终比分反推：13 → 13，16 → 16，19 → 19，以此类推。
 */
export function matchTarget(rounds: RoundRecord[]): number {
  const top = rounds.reduce((acc, round) => Math.max(acc, round.scoreT, round.scoreCT), 0);
  if (top <= 13) return 13;
  return 13 + 3 * Math.ceil((top - 13) / 3);
}

export type KeyRoundTag = 'deciding' | 'matchpoint' | 'ace' | 'clutch' | 'defuse' | 'plant' | 'multi' | 'overtime';

/** 标签全部对应引擎真实字段，顺序即展示优先级。 */
export const KEY_ROUND_TAG_ORDER: KeyRoundTag[] = ['deciding', 'matchpoint', 'ace', 'clutch', 'defuse', 'plant', 'multi', 'overtime'];

export const KEY_ROUND_TAG_LABEL: Record<KeyRoundTag, string> = {
  deciding: '决胜回合',
  matchpoint: '赛点',
  ace: 'ACE',
  clutch: '残局',
  defuse: '拆包',
  plant: '安包',
  multi: '多杀',
  overtime: '加时',
};

export interface KeyRound {
  roundNumber: number;
  winner: Side | null;
  reason: RoundRecord['reason'];
  ours: number;
  theirs: number;
  tags: KeyRoundTag[];
}

export interface KeyRoundOptions {
  limit?: number;
  /** 覆盖目标分（默认由最终比分反推）。测试会显式传入。 */
  target?: number;
}

/**
 * 关键回合：赛点 / 决胜 / ACE / 残局 / 拆包 / 安包 / 多杀 / 加时。
 * 每个标签都能从 RoundRecord + 事件精确定位，不做任何猜测。
 */
export function keyRoundsOf(rounds: RoundRecord[], sides: Side[], options: KeyRoundOptions = {}): KeyRound[] {
  const limit = options.limit ?? 10;
  const target = options.target ?? matchTarget(rounds);
  const progress = scoreProgression(rounds, sides);
  const list: KeyRound[] = [];
  rounds.forEach((round, index) => {
    const events = round.events ?? [];
    const beforeOurs = index > 0 ? progress[index - 1].ours : 0;
    const beforeTheirs = index > 0 ? progress[index - 1].theirs : 0;
    const tags: KeyRoundTag[] = [];
    if (events.some((event) => event.kind === 'clutch')) tags.push('clutch');
    if (events.some((event) => event.kind === 'multi' && event.text.includes('ACE'))) tags.push('ace');
    else if (events.some((event) => event.kind === 'multi')) tags.push('multi');
    if (round.reason === 'defuse') tags.push('defuse');
    if (round.bombPlanted) tags.push('plant');
    if (round.wentToOvertime) tags.push('overtime');
    if (beforeOurs === target - 1 || beforeTheirs === target - 1) tags.push('matchpoint');
    if (index === rounds.length - 1) tags.push('deciding');
    if (tags.length === 0) return;
    tags.sort((a, b) => KEY_ROUND_TAG_ORDER.indexOf(a) - KEY_ROUND_TAG_ORDER.indexOf(b));
    list.push({
      roundNumber: round.roundNumber,
      winner: round.winner,
      reason: round.reason,
      ours: progress[index].ours,
      theirs: progress[index].theirs,
      tags,
    });
  });
  return list.length > limit ? list.slice(list.length - limit) : list;
}

/** 我方比赛结束时的阵营（同队选手共享 side）。 */
export function finalSideOf(summary: MatchSummary | null): Side | null {
  if (!summary || summary.scoreboard.length === 0) return null;
  const teamId = ourTeamId(summary.scoreboard);
  if (!teamId) return null;
  const line = summary.scoreboard.find((row) => row.teamId === teamId);
  return line ? line.side : null;
}

/** 回放 + 摘要 → 每回合我方所在阵营；信息不足时返回空数组（调用方退回按阵营展示）。 */
export function sidesForReplay(summary: MatchSummary | null, replay: ReplayData | null): Side[] {
  if (!replay || replay.rounds.length === 0) return [];
  const finalSide = finalSideOf(summary);
  if (!finalSide) return [];
  return sidesByRound(replay.rounds, halftimeRounds(replay.events), finalSide);
}

/** 回放缺失时的降级：直接用摘要里引擎标记过的关键回合。 */
export interface KeyRoundView {
  roundNumber: number;
  winner: Side | null;
  reason?: RoundRecord['reason'];
  ours?: number;
  theirs?: number;
  tags: KeyRoundTag[];
  /** 摘要里的引擎原文（英文，未本地化）。 */
  text?: string;
}

export function keyRoundViewsFromSummary(summary: MatchSummary): KeyRoundView[] {
  return summary.keyRounds.map((row) => ({
    roundNumber: row.roundNumber,
    winner: row.winner,
    tags: [],
    text: row.text,
  }));
}

export function keyRoundViews(rounds: RoundRecord[], sides: Side[], options: KeyRoundOptions = {}): KeyRoundView[] {
  return keyRoundsOf(rounds, sides, options).map((row) => ({
    roundNumber: row.roundNumber,
    winner: row.winner,
    reason: row.reason,
    ours: row.ours,
    theirs: row.theirs,
    tags: row.tags,
  }));
}

function kdLabel(kills: number, deaths: number): string {
  return (Math.round((kills / Math.max(1, deaths)) * 100) / 100).toFixed(2);
}

function StatTable({
  title, lines, mvpId, accent,
}: { title: string; lines: MatchStatLine[]; mvpId: string | null; accent: boolean }) {
  const { tr } = useT();
  if (lines.length === 0) return null;
  const totals = teamTotals(lines);
  return (
    <div className='min-w-0'>
      <div className='mb-1.5 flex items-baseline justify-between gap-2'>
        <span className={clsx('truncate text-[14px] font-semibold', accent ? 'text-txt' : 'text-txt-muted')}>{title}</span>
        <span className='type-data shrink-0 text-txt-muted'>{totals.kills} / {totals.deaths} / {totals.assists}</span>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full border-collapse text-[14px]'>
          <thead>
            <tr className='text-[12px] text-txt-muted'>
              <th className='px-2 py-1 text-left font-medium'>{tr('选手')}</th>
              <th className='px-1.5 py-1 text-right font-medium' title='K'>K</th>
              <th className='px-1.5 py-1 text-right font-medium' title='D'>D</th>
              <th className='px-1.5 py-1 text-right font-medium' title='A'>A</th>
              <th className='px-1.5 py-1 text-right font-medium' title='ADR'>ADR</th>
              <th className='px-1.5 py-1 text-right font-medium' title='KAST'>KAST</th>
              <th className='px-1.5 py-1 text-right font-medium' title='K/D'>K/D</th>
              <th className='px-1.5 py-1 text-right font-medium' title={tr('评分')}>{tr('评分')}</th>
              <th className='px-1.5 py-1 text-right font-medium' title='Opening kills'>OK</th>
              <th className='px-1.5 py-1 text-right font-medium' title='Multi-kills'>MK</th>
              <th className='px-1.5 py-1 text-right font-medium' title='Clutches'>1vX</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.cardInstanceId + line.playerId}
                className={clsx('border-t border-white/5', accent && 'bg-accent/[0.06]')}
              >
                <td className='max-w-[180px] px-2 py-1.5'>
                  <span className='flex items-center gap-1.5'>
                    <span className={clsx('truncate font-semibold', accent ? 'text-txt' : 'text-txt-muted')}>{line.nickname}</span>
                    {mvpId !== null && line.cardInstanceId === mvpId ? <Crown size={12} className='shrink-0 text-accent' /> : null}
                  </span>
                </td>
                <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>{line.kills}</td>
                <td className='px-1.5 py-1.5 text-right font-mono tabular-nums text-txt-muted'>{line.deaths}</td>
                <td className='px-1.5 py-1.5 text-right font-mono tabular-nums text-txt-muted'>{line.assists}</td>
                <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>{line.adr.toFixed(1)}</td>
                <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>{line.kast.toFixed(0)}</td>
                <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>{line.kd.toFixed(2)}</td>
                <td className={clsx('px-1.5 py-1.5 text-right font-mono font-semibold tabular-nums', line.rating >= 1.1 ? 'text-accent' : line.rating < 0.85 ? 'text-danger' : 'text-txt')}>
                  {line.rating.toFixed(2)}
                </td>
                <td className='px-1.5 py-1.5 text-right font-mono tabular-nums text-txt-muted'>{line.openingKills}</td>
                <td className='px-1.5 py-1.5 text-right font-mono tabular-nums text-txt-muted'>{line.multiKills}</td>
                <td className='px-1.5 py-1.5 text-right font-mono tabular-nums text-txt-muted'>{line.clutches}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className='border-t border-white/10 text-txt-muted'>
              <td className='px-2 py-1.5 text-[12px] font-semibold'>{tr('全队')}</td>
              <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>{totals.kills}</td>
              <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>{totals.deaths}</td>
              <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>{totals.assists}</td>
              <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>{totals.adr.toFixed(1)}</td>
              <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>—</td>
              <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>{kdLabel(totals.kills, totals.deaths)}</td>
              <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>—</td>
              <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>—</td>
              <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>—</td>
              <td className='px-1.5 py-1.5 text-right font-mono tabular-nums'>—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function EconomySparkline({ series }: { series: RoundBank[] }) {
  const { tr } = useT();
  if (series.length === 0) return null;
  const width = 300;
  const height = 64;
  const max = series.reduce((acc, point) => Math.max(acc, point.ours, point.theirs), 1);
  const step = series.length > 1 ? width / (series.length - 1) : 0;
  const poly = (key: 'ours' | 'theirs') => series
    .map((point, index) => (index * step).toFixed(1) + ',' + (height - (point[key] / max) * height).toFixed(1))
    .join(' ');
  return (
    <div>
      <svg viewBox={'0 0 ' + width + ' ' + height} preserveAspectRatio='none' className='h-16 w-full' role='img' aria-label={tr('经济曲线')}>
        <polyline points={poly('theirs')} fill='none' stroke='#60A5FA' strokeWidth={1.5} />
        <polyline points={poly('ours')} fill='none' stroke='#F5A623' strokeWidth={1.5} />
      </svg>
      <div className='mt-1 flex flex-wrap items-center justify-between gap-2 text-[12px] text-txt-muted'>
        <span className='inline-flex items-center gap-1'>
          <span className='h-1.5 w-3 rounded-sm bg-accent' /> {tr('我方')}
        </span>
        <span className='inline-flex items-center gap-1'>
          <span className='h-1.5 w-3 rounded-sm bg-sky-400' /> {tr('对手')}
        </span>
        <span className='font-mono tabular-nums'>{moneyLabel(max)}</span>
      </div>
    </div>
  );
}

function KeyRoundList({ rows }: { rows: KeyRoundView[] }) {
  const { tr } = useT();
  if (rows.length === 0) {
    return (
      <p className='rounded-xl border border-dashed border-white/10 p-4 text-center text-[13px] text-txt-muted'>
        {tr('本场比赛没有标记出关键回合。')}
      </p>
    );
  }
  return (
    <ol className='space-y-1.5'>
      {rows.map((row) => (
        <li key={row.roundNumber} className='rounded-xl border border-white/5 bg-ink-700/40 px-2.5 py-2'>
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <span className='font-mono text-[12px] text-txt-muted'>R{row.roundNumber}</span>
            {typeof row.ours === 'number' && typeof row.theirs === 'number' ? (
              <span className='font-display text-[14px] font-semibold tabular-nums text-txt'>
                {row.ours}<span className='text-txt-muted'>:</span>{row.theirs}
              </span>
            ) : null}
            {row.winner ? <span className='text-[12px] text-txt-muted'>{row.winner}</span> : null}
            {row.reason ? <span className='text-[12px] text-txt-muted'>· {tr(REASON_LABEL[row.reason] ?? row.reason)}</span> : null}
            <span className='ml-auto flex flex-wrap gap-1'>
              {row.tags.map((tag) => (
                <span key={tag} className='rounded-md border border-accent/30 bg-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent'>
                  {tr(KEY_ROUND_TAG_LABEL[tag])}
                </span>
              ))}
            </span>
          </div>
          {row.text ? <p className='mt-1 text-[12px] leading-snug text-txt-muted'>{row.text}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function MatchStats({ summary, replay }: { summary: MatchSummary; replay: ReplayData | null }) {
  const { tr } = useT();
  const groups = useMemo(() => groupByTeam(summary.scoreboard), [summary.scoreboard]);
  const ours = ourTeamId(summary.scoreboard);
  const mvpId = summary.mvp ? summary.mvp.cardInstanceId : null;
  const sides = useMemo(() => sidesForReplay(summary, replay), [summary, replay]);
  const keyRows = useMemo<KeyRoundView[]>(() => {
    if (replay && replay.rounds.length > 0) return keyRoundViews(replay.rounds, sides);
    return keyRoundViewsFromSummary(summary);
  }, [replay, sides, summary]);
  const banks = useMemo<RoundBank[]>(() => {
    if (!replay || replay.rounds.length === 0 || sides.length !== replay.rounds.length) return [];
    return economyProgression(replay.rounds, sides);
  }, [replay, sides]);
  const progress = useMemo<RoundScore[]>(() => {
    if (!replay || replay.rounds.length === 0 || sides.length !== replay.rounds.length) return [];
    return scoreProgression(replay.rounds, sides);
  }, [replay, sides]);

  /** 回放存在但阵营无法还原（摘要缺计分板）时的降级：直接显示引擎原始阵营比分。 */
  const sideBoard = replay && replay.rounds.length > 0 && progress.length === 0 ? replay.rounds : [];
  const ourGroup = groups.find((group) => group.teamId === ours);
  const theirGroups = groups.filter((group) => group.teamId !== ours);

  return (
    <div className='space-y-4'>
      <Panel className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className={clsx('type-data rounded-md border px-2 py-0.5 font-semibold', summary.won ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-danger/30 bg-danger/15 text-danger')}>
              {summary.won ? tr('胜') : tr('负')}
            </span>
            <span className='text-[13px] text-txt-muted'>
              {MAPS[summary.mapId] ? MAPS[summary.mapId].name : summary.mapId} · {tr(MODE_LABEL[summary.mode])}
            </span>
            <span className='text-[13px] text-txt-muted'>· {summary.roundsPlayed}{tr(' 回合')}</span>
          </div>
          <span className='text-[12px] text-txt-muted'>{tr('比赛时间')} {new Date(summary.playedAt).toLocaleString()}</span>
        </div>
        <div className='flex items-center justify-center gap-3 sm:gap-6'>
          <span className='min-w-0 flex-1 truncate text-right text-[15px] font-semibold text-txt'>{summary.teamName}</span>
          <span className='font-display text-3xl font-semibold tabular-nums text-txt'>
            {summary.scoreFor}
            <span className='px-1 text-txt-muted'>:</span>
            {summary.scoreAgainst}
          </span>
          <span className='min-w-0 flex-1 truncate text-[15px] font-semibold text-txt-muted'>{summary.opponentName}</span>
        </div>
        <p className='text-center text-[12px] text-txt-muted'>
          {summary.mvp ? 'MVP ' + summary.mvp.nickname + ' · ' + summary.mvp.rating.toFixed(2) : tr('暂无 MVP')}
        </p>
      </Panel>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]'>
        <Panel className='space-y-4'>
          <div className='flex flex-wrap items-baseline justify-between gap-2'>
            <h2 className='type-title-sm font-display font-semibold tracking-tight text-txt'>{tr('选手计分板')}</h2>
            <span className='text-[12px] text-txt-muted'>{tr('评分、ADR 与 KAST 都由引擎根据模拟事件计算。')}</span>
          </div>
          {summary.scoreboard.length === 0 ? (
            <p className='rounded-xl border border-dashed border-white/10 p-6 text-center text-[13px] text-txt-muted'>
              {tr('暂无计分板数据 —— 打完一回合后就会填充。')}
            </p>
          ) : (
            <div className='space-y-4'>
              {ourGroup ? <StatTable title={summary.teamName} lines={ourGroup.lines} mvpId={mvpId} accent /> : null}
              {theirGroups.map((group) => (
                <StatTable key={group.teamId} title={summary.opponentName} lines={group.lines} mvpId={mvpId} accent={false} />
              ))}
            </div>
          )}
        </Panel>

        <Panel className='space-y-3'>
          <h2 className='type-title-sm font-display font-semibold tracking-tight text-txt'>{tr('关键回合')}</h2>
          {!replay || replay.rounds.length === 0 ? (
            <p className='text-[12px] leading-relaxed text-txt-muted'>{tr('回放缺失，关键回合改用战绩摘要里的引擎标记。')}</p>
          ) : null}
          <KeyRoundList rows={keyRows} />
        </Panel>
      </div>

      <Panel className='space-y-3'>
        <h2 className='type-title-sm font-display font-semibold tracking-tight text-txt'>{tr('逐回合比分')}</h2>
        {progress.length === 0 && sideBoard.length === 0 ? (
          <p className='text-[13px] text-txt-muted'>{tr('没有可用的回放。')}</p>
        ) : (
          <>
            <div className='flex flex-wrap gap-1'>
              {progress.length > 0
                ? progress.map((point) => (
                  <span
                    key={point.roundNumber}
                    className={clsx(
                      'rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums',
                      point.ours > point.theirs
                        ? 'border-accent/40 bg-accent/15 text-accent'
                        : point.ours < point.theirs
                          ? 'border-danger/30 bg-danger/10 text-danger'
                          : 'border-white/10 text-txt-muted',
                    )}
                    title={'R' + point.roundNumber}
                  >
                    {point.ours}:{point.theirs}
                  </span>
                ))
                : sideBoard.map((round) => (
                  <span key={round.roundNumber} className='rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-txt-muted' title={'R' + round.roundNumber}>
                    T {round.scoreT}:{round.scoreCT} CT
                  </span>
                ))}
            </div>
            {progress.length === 0 ? (
              <p className='text-[12px] text-txt-muted'>{tr('阵营无法还原，按 T / CT 展示。')}</p>
            ) : null}
            {banks.length > 0 ? (
              <div className='pt-1'>
                <div className='mb-1 text-[12px] text-txt-muted'>{tr('经济曲线')}</div>
                <EconomySparkline series={banks} />
                <p className='mt-1 text-[12px] leading-relaxed text-txt-muted'>{tr('经济数值是回合结束时双方剩余资金，按该回合的阵营映射到我方 / 对手。')}</p>
              </div>
            ) : null}
            <p className='text-[12px] leading-relaxed text-txt-muted'>{tr('逐回合比分按阵营（T / CT）记录，半场换边时刻由回放里的 halftime 事件还原。')}</p>
          </>
        )}
      </Panel>

      <Panel className='space-y-1.5'>
        <div className='text-[13px] font-semibold text-txt'>{tr('以下指标没有显示，因为引擎没有持久化对应数据：')}</div>
        <ul className='list-disc space-y-0.5 pl-5 text-[12px] leading-relaxed text-txt-muted'>
          <li>{tr('爆头率（headshots 只存在于内存 MatchState，未写入计分板行）')}</li>
          <li>{tr('逐回合的选手伤害、血量与存活状态（回合日志只存事件文本）')}</li>
          <li>{tr('道具使用与逐人购买明细（只有双方回合结束时的总资金）')}</li>
          <li>{tr('逐回合的助攻归属（助攻只在比赛结束后汇总）')}</li>
          <li>{tr('残局只记录次数：引擎只标记了 1vX 的机会与结果，没有把 X 写进日志。')}</li>
        </ul>
      </Panel>
    </div>
  );
}
