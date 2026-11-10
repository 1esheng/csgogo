import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MatchEvent, RoundRecord, Side } from '@/types';
import { REASON_LABEL } from '@/data/config';
import { useT } from '@/hooks/useLang';
import { roundLabel } from '@/i18n/display';
import { clockLabel, moneyLabel } from './matchUi';
import type { ReplayData } from './MatchStats';

/** 引擎只在真正击杀时才写 victim（round.ts:170-177），所以有 victim 的 duel/opening 就是一次击杀。 */
export interface KillPair {
  id: string;
  clock: number;
  killer: string;
  victim: string;
  opening: boolean;
  side?: Side;
}

export function killPairsOf(events: MatchEvent[]): KillPair[] {
  const kills: KillPair[] = [];
  events.forEach((event) => {
    if (event.kind !== 'duel' && event.kind !== 'opening') return;
    if (!event.victim) return;
    kills.push({
      id: event.id,
      clock: event.clock,
      killer: event.actor ?? '?',
      victim: event.victim,
      opening: event.kind === 'opening',
      side: event.side,
    });
  });
  return kills;
}

/** 回合里值得单列的非击杀事件；buy / tactic / info / utility 属于细节噪声，不在这里重复。 */
const KEY_EVENT_KINDS: MatchEvent['kind'][] = [
  'plant', 'defuse', 'explode', 'timeout', 'elimination', 'clutch', 'multi', 'halftime',
];

export interface ReplayRoundRow {
  roundNumber: number;
  winner: Side | null;
  reason: RoundRecord['reason'];
  scoreT: number;
  scoreCT: number;
  /** 我方 / 对手累计比分；阵营无法还原时为 null（退回按 T / CT 展示）。 */
  ours: number | null;
  theirs: number | null;
  bank: { ours: number; theirs: number } | null;
  bombPlanted: boolean;
  kills: KillPair[];
  keyEvents: MatchEvent[];
  eventCount: number;
}

export function buildRoundRows(rounds: RoundRecord[], sides: Side[] = []): ReplayRoundRow[] {
  return rounds.map((round, index) => {
    const side = sides[index];
    return {
      roundNumber: round.roundNumber,
      winner: round.winner,
      reason: round.reason,
      scoreT: round.scoreT,
      scoreCT: round.scoreCT,
      ours: side ? (side === 'T' ? round.scoreT : round.scoreCT) : null,
      theirs: side ? (side === 'T' ? round.scoreCT : round.scoreT) : null,
      bank: side
        ? { ours: side === 'T' ? round.economy.t : round.economy.ct, theirs: side === 'T' ? round.economy.ct : round.economy.t }
        : null,
      bombPlanted: round.bombPlanted,
      kills: killPairsOf(round.events),
      keyEvents: round.events.filter((event) => KEY_EVENT_KINDS.includes(event.kind)),
      eventCount: round.events.length,
    };
  });
}

function RoundRow({ row, open, onToggle }: { row: ReplayRoundRow; open: boolean; onToggle: () => void }) {
  const { tr } = useT();
  const scoreText = typeof row.ours === 'number' && typeof row.theirs === 'number'
    ? row.ours + ' : ' + row.theirs
    : 'T ' + row.scoreT + ' : ' + row.scoreCT + ' CT';
  return (
    <div className='overflow-hidden rounded-xl border border-white/5 bg-ink-700/40'>
      <button
        type='button'
        onClick={onToggle}
        aria-expanded={open}
        className='focus-ring t-colors flex w-full flex-wrap items-center gap-x-2.5 gap-y-1 px-2.5 py-2 text-left hover:bg-white/[0.03]'
      >
        {open ? <ChevronDown size={14} className='shrink-0 text-txt-muted' /> : <ChevronRight size={14} className='shrink-0 text-txt-muted' />}
        <span className='font-mono text-[12px] text-txt-muted'>{roundLabel(row.roundNumber)}</span>
        <span className='font-display text-[14px] font-semibold tabular-nums text-txt'>{scoreText}</span>
        {row.winner ? (
          <span className={clsx('rounded-md border px-1.5 py-0.5 text-[11px] font-semibold', row.winner === 'T' ? 'border-accent/30 bg-accent/15 text-accent' : 'border-white/10 bg-white/5 text-txt-muted')}>
            {row.winner}
          </span>
        ) : null}
        <span className='text-[12px] text-txt-muted'>{tr(REASON_LABEL[row.reason] ?? row.reason)}</span>
        <span className='ml-auto flex items-center gap-2 font-mono text-[11px] tabular-nums text-txt-muted'>
          <span>{row.kills.length} K</span>
          {row.bank ? <span>{moneyLabel(row.bank.ours)} {tr('对')} {moneyLabel(row.bank.theirs)}</span> : null}
        </span>
      </button>
      {open ? (
        <div className='space-y-2 border-t border-white/5 px-2.5 py-2'>
          <div>
            <div className='mb-1 text-[12px] font-semibold text-txt-muted'>{tr('击杀序列')}</div>
            {row.kills.length === 0 ? (
              <p className='text-[12px] text-txt-muted'>{tr('本回合没有击杀记录。')}</p>
            ) : (
              <ol className='space-y-0.5'>
                {row.kills.map((kill, index) => (
                  <li key={kill.id} className='flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1 text-[13px]'>
                    <span className='shrink-0 font-mono text-[11px] tabular-nums text-txt-muted'>{index + 1}</span>
                    <span className='shrink-0 font-mono text-[11px] tabular-nums text-txt-muted'>{clockLabel(kill.clock)}</span>
                    <span className={clsx('min-w-0 truncate font-semibold', kill.opening ? 'text-accent' : 'text-txt')}>{kill.killer}</span>
                    <span className='shrink-0 text-txt-muted' aria-hidden>›</span>
                    <span className='min-w-0 truncate text-txt-muted'>{kill.victim}</span>
                    {kill.opening ? <span className='ml-auto shrink-0 text-[11px] font-semibold text-accent'>{tr('首杀')}</span> : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
          {row.keyEvents.length > 0 ? (
            <div>
              <div className='mb-1 text-[12px] font-semibold text-txt-muted'>{tr('其它事件')}</div>
              <ul className='space-y-0.5'>
                {row.keyEvents.map((event) => (
                  <li key={event.id} className='flex items-start gap-2 text-[13px] leading-snug'>
                    <span className='shrink-0 font-mono text-[11px] tabular-nums text-txt-muted'>{clockLabel(event.clock)}</span>
                    <span className='min-w-0 flex-1 text-txt-muted'>{event.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className='text-[11px] text-txt-muted'>{tr('回合结果')} · {tr(REASON_LABEL[row.reason] ?? row.reason)} · {tr('共 ')}{row.eventCount}{tr(' 条事件')}</p>
        </div>
      ) : null}
    </div>
  );
}

export function RoundReplay({ replay, sides }: { replay: ReplayData | null; sides?: Side[] }) {
  const { tr } = useT();
  const [open, setOpen] = useState<number | null>(null);
  const rows = useMemo(() => (replay ? buildRoundRows(replay.rounds, sides ?? []) : []), [replay, sides]);

  if (!replay || rows.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-white/10 p-6 text-center'>
        <div className='text-[14px] font-semibold text-txt'>{tr('没有可用的回放。')}</div>
        <p className='mx-auto mt-1 max-w-xl text-[12px] leading-relaxed text-txt-muted'>
          {tr('回放只保存在 IndexedDB 里，并只保留最近 20 场；本场已超出上限或当时没有写入。下面只显示战绩摘要里已有的数据。')}
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {rows.map((row) => (
        <RoundRow
          key={row.roundNumber}
          row={row}
          open={open === row.roundNumber}
          onToggle={() => setOpen(open === row.roundNumber ? null : row.roundNumber)}
        />
      ))}
    </div>
  );
}
