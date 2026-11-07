import React from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import type { CoachPull } from '@/types';
import { COACH_MAP, COACH_TIER_META, coachTier } from '@/data/coaches';
import { Button, Panel } from '@/components/ui';

/**
 * 教练开包结果：版式与选手开包一致（中性面 + 发丝边 + 2px 档位顶线）。
 * 真实结算（stores/gameStore.ts › openCoachPack）：新教练进入教练组，重复教练给
 * 自己 +25 执教经验；不返还金币。
 */
export function CoachReveal({
  results, skipAnimation = false, onClose,
}: { results: CoachPull[]; skipAnimation?: boolean; onClose: () => void }) {
  const { tr } = useT();
  const newCount = results.filter((r) => r.isNew).length;
  const duplicates = results.length - newCount;
  const xp = results.reduce((sum, r) => sum + r.xpGained, 0);

  return (
    <Panel className='relative overflow-hidden'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='label-xs'>{tr('开包结果')}</div>
          <div className='mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-txt-muted'>
            <span className='font-display text-xl font-semibold text-txt'>{results.length}{' '}{tr('位教练')}</span>
            <span>{tr('新签')} <span className='font-semibold tabular-nums text-txt'>{newCount}</span></span>
            <span>{tr('重复')} <span className='font-semibold tabular-nums text-txt'>{duplicates}</span></span>
            {duplicates > 0 ? <span>{tr('执教经验 +')}<span className='font-semibold tabular-nums text-txt'>{xp}</span></span> : null}
          </div>
        </div>
        <Button variant='outline' size='sm' onClick={onClose}>{tr('继续')} <ArrowRight size={14} /></Button>
      </div>

      <ul aria-label={tr('签下的教练')} className='mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5'>
        {results.map((result, index) => {
          const info = COACH_MAP[result.coachId];
          if (!info) return null;
          const tier = coachTier(info.ability);
          const meta = COACH_TIER_META[tier];
          return (
            <li
              key={result.coachId + '-' + index}
              className={clsx('relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-ink-800 p-3', !skipAnimation && 'animate-fade-up')}
              style={{ animationDelay: skipAnimation ? undefined : Math.min(index * 60, 600) + 'ms' }}
            >
              <span aria-hidden='true' className='absolute inset-x-0 top-0 h-0.5' style={{ backgroundColor: meta.color }} />
              <div className='relative flex items-center justify-between gap-1.5'>
                <span className='type-data shrink-0 font-semibold tracking-wide text-txt-muted'>{tier}</span>
                <span className='type-data shrink-0 font-semibold' style={{ color: meta.color }}>{tr(meta.label)}</span>
              </div>
              <div className='relative mt-2 flex items-center gap-2'>
                <span className='grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-ink-900 font-display text-[12px] font-semibold'>
                  {info.nickname.slice(0, 2).toUpperCase()}
                </span>
                <div className='min-w-0'>
                  <div className='truncate font-display text-[15px] font-semibold text-txt' title={info.nickname}>{info.nickname}</div>
                  <div className='type-data truncate text-txt-muted'>{info.country} · {info.style}</div>
                </div>
              </div>
              <div className='relative mt-2 border-t border-white/[0.08] pt-1.5 text-[12px]'>
                <div className='flex items-baseline justify-between gap-1.5'>
                  <span className='text-txt-muted'>{tr('执教能力')}</span>
                  <span className='font-semibold tabular-nums' style={{ color: meta.color }}>{info.ability}</span>
                </div>
                <div className={clsx('mt-0.5 font-medium', result.isNew ? 'text-txt' : 'text-txt-muted')}>
                  {result.isNew ? tr('新教练 · 已进入教练组') : tr('重复 · 执教经验 +') + result.xpGained}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className='mt-4 rounded-xl border border-white/10 bg-ink-900/50 p-3 text-[12px] leading-relaxed text-txt-muted'>
        <span className='font-semibold text-txt'>{tr('结算说明')}</span>{' '}
        {tr('教练包与选手包完全独立。新教练直接进入教练组；重复教练把 25 点执教经验加给自己，可继续累积。本次没有返还金币。')}
      </div>
    </Panel>
  );
}
