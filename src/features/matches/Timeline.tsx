import { useEffect, useRef, useState } from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import type { MatchEvent, MatchEventKind, MatchState } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { EVENT_KIND_META, clockLabel } from './matchUi';

/**
 * Current-round timeline. Reveal pace follows settings.matchSpeed; the text of
 * every line is the engine's own event text, never generated UI copy.
 */
export function RoundTimeline({ match }: { match: MatchState }) {
  const { tr } = useT();
  const speed = useGameStore((s) => s.settings.matchSpeed);
  const round = match.rounds[match.rounds.length - 1];
  const events = round ? round.events : [];
  const roundKey = round ? round.roundNumber : 0;
  const [visible, setVisible] = useState(events.length);
  const scroller = useRef<HTMLDivElement | null>(null);
  const previousRound = useRef(roundKey);

  useEffect(() => {
    if (previousRound.current !== roundKey) {
      previousRound.current = roundKey;
      if (events.length === 0) {
        setVisible(0);
        return;
      }
      setVisible(1);
      let shown = 1;
      const delay = Math.round((events.length > 20 ? 320 : 620) / speed);
      const timer = window.setInterval(() => {
        shown += 1;
        setVisible(shown);
        if (shown >= events.length) window.clearInterval(timer);
      }, Math.max(40, delay));
      return () => window.clearInterval(timer);
    }
    // Only a brand new round animates; anything else (speed change, late mount) shows every event.
    setVisible(events.length);
    return;
  }, [roundKey, events.length, speed]);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [visible, roundKey]);

  if (!round) {
    return (
      <div className='flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 p-6 text-center'>
        <div className='font-display text-sm font-semibold text-txt'>{tr('还没有进行回合')}</div>
        <p className='max-w-sm text-xs text-txt-muted'>
          {tr('第 ')}{match.roundNumber}{tr(' 回合已就绪。先定好购买、战术与目标，再点「推进回合」。')}
        </p>
      </div>
    );
  }

  const shownEvents = events.slice(0, Math.max(0, visible));

  return (
    <div className='flex h-full flex-col'>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='font-display text-sm font-semibold text-txt'>{tr('第 ')}{round.roundNumber}{tr(' 回合')}</span>
          {round.winner ? (
            <span className='text-[11px] text-txt-muted'>{round.winner}{tr(' 方获胜')}</span>
          ) : null}
        </div>
        <span className='text-[11px] text-txt-muted'>
          {tr('共 ')}{round.events.length}{tr(' 条事件 · 已显示 ')}{shownEvents.length}
        </span>
      </div>
      <div ref={scroller} className='relative max-h-[42vh] min-h-[200px] flex-1 overflow-y-auto pr-1'>
        <div className='absolute bottom-1 left-[7px] top-1 w-px bg-gradient-to-b from-accent/50 via-white/10 to-transparent' />
        {shownEvents.map((e) => {
          const meta = EVENT_KIND_META[e.kind];
          return (
            <div key={e.id} className='relative flex animate-fade-up gap-2 pb-2.5 pl-0'>
              <span className={clsx('relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-ink-800', meta.dot)} />
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-[10px] text-txt-muted'>{clockLabel(e.clock)}</span>
                  <span className={clsx('text-[10px] font-semibold ', meta.tone)}>{tr(meta.label)}</span>
                  {e.side ? <span className='text-[9px] text-txt-muted'>{e.side}</span> : null}
                </div>
                <p className='text-[13px] leading-snug text-txt'>{e.text}</p>
              </div>
            </div>
          );
        })}
        {events.length === 0 ? (
          <p className='pl-5 text-xs text-txt-muted'>{tr('本回合没有产生事件。')}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Full match log with a kind filter. */
export function MatchLog({ events }: { events: MatchEvent[] }) {
  const { tr } = useT();
  const [filter, setFilter] = useState<'all' | MatchEventKind>('all');
  const kinds = [...new Set(events.map((e) => e.kind))];
  const filtered = filter === 'all' ? events : events.filter((e) => e.kind === filter);
  const shown = filtered.slice(-300);
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [filter, events.length]);

  return (
    <div className='flex h-full flex-col'>
      <div className='mb-2 flex flex-wrap gap-1'>
        <LogChip label={tr('全部')} active={filter === 'all'} onClick={() => setFilter('all')} />
        {kinds.map((kind) => (
          <LogChip
            key={kind}
            label={tr(EVENT_KIND_META[kind].label)}
            active={filter === kind}
            onClick={() => setFilter(kind)}
          />
        ))}
      </div>
      <div ref={scroller} className='max-h-[42vh] min-h-[200px] flex-1 space-y-1 overflow-y-auto pr-1'>
        {shown.map((e) => {
          const meta = EVENT_KIND_META[e.kind];
          return (
            <div key={e.id} className='flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1'>
              <span className='mt-0.5 shrink-0 font-mono text-[10px] text-txt-muted'>R{e.round}</span>
              <span className='mt-0.5 shrink-0 font-mono text-[10px] text-txt-muted'>{clockLabel(e.clock)}</span>
              <span className={clsx('mt-0.5 w-[74px] shrink-0 text-[9px] font-semibold ', meta.tone)}>
                {tr(meta.label)}
              </span>
              <span className='min-w-0 flex-1 text-[12px] leading-snug text-txt'>{e.text}</span>
            </div>
          );
        })}
        {shown.length === 0 ? <p className='text-xs text-txt-muted'>{tr('暂无此类事件。')}</p> : null}
      </div>
    </div>
  );
}

function LogChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'focus-ring rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors',
        active ? 'border-accent/50 bg-accent/15 text-accent' : 'border-white/10 text-txt-muted hover:text-txt',
      )}
    >
      {label}
    </button>
  );
}
