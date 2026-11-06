import React from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { CoachPull } from '@/types';
import { COACH_MAP, COACH_TIER_META, coachTier } from '@/data/coaches';
import { Badge, Button, Panel } from '@/components/ui';

/** 教练开包结果：与选手开包完全一致的版式与动画。 */
export function CoachReveal({
  results, skipAnimation = false, onClose,
}: { results: CoachPull[]; skipAnimation?: boolean; onClose: () => void }) {
  const { tr } = useT();
  const newCount = results.filter((r) => r.isNew).length;
  const duplicates = results.length - newCount;
  const xp = results.reduce((sum, r) => sum + r.xpGained, 0);

  return (
    <Panel className='relative overflow-hidden border-accent/25'>
      <div className='pointer-events-none absolute inset-0 grid-noise opacity-70' />
      <div className='relative flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='label-xs'>{tr('开包结果')}</div>
          <div className='font-display text-xl font-semibold text-txt'>
            {results.length} 位教练 · 新签 {newCount} · 重复 {duplicates}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {duplicates > 0 ? <Badge tone='success'>执教经验 +{xp}</Badge> : null}
          <Button variant='outline' onClick={onClose}>{tr('继续')} <ArrowRight size={14} /></Button>
        </div>
      </div>

      <div className='relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
        {results.map((result, index) => {
          const info = COACH_MAP[result.coachId];
          if (!info) return null;
          const tier = coachTier(info.ability);
          const meta = COACH_TIER_META[tier];
          return (
            <div
              key={result.coachId + '-' + index}
              className={clsx('relative overflow-hidden rounded-xl border p-3', !skipAnimation && 'animate-fade-up')}
              style={{
                borderColor: meta.color + '55',
                background: 'linear-gradient(160deg, ' + meta.color + '22, rgba(21,26,35,0.92))',
                boxShadow: '0 0 26px -10px ' + meta.color + '66',
                animationDelay: skipAnimation ? undefined : Math.min(index * 60, 600) + 'ms',
              }}
            >
              <div className='flex items-center justify-between gap-1'>
                <span className='font-display text-[12px] font-semibold ' style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span
                  className={clsx(
                    'rounded px-1.5 py-0.5 text-[11px] font-semibold ',
                    result.isNew ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-txt-muted',
                  )}
                >
                  {result.isNew ? tr('新教练') : tr('重复 · +25 经验')}
                </span>
              </div>
              <div className='mt-2 flex items-center gap-2'>
                <span
                  className='grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-[12px] font-semibold'
                  style={{ background: meta.color + '22', color: meta.color }}
                >
                  {info.nickname.slice(0, 2).toUpperCase()}
                </span>
                <div className='min-w-0'>
                  <div className='truncate font-display text-[15px] font-semibold text-txt'>{info.nickname}</div>
                  <div className='text-[12px] text-txt-muted'>{info.country} · {info.style}</div>
                </div>
              </div>
              <div className='mt-2 border-t border-white/10 pt-1.5 text-[12px] text-txt-muted'>
                {tr('执教能力')} <span className='font-semibold' style={{ color: meta.color }}>{info.ability}</span>
                {' · '}{result.isNew ? tr('已进入教练组') : tr('执教经验 +') + result.xpGained}
              </div>
            </div>
          );
        })}
      </div>

      <div className='relative mt-4 rounded-xl border border-white/10 bg-ink-900/50 p-3 text-[12px] leading-relaxed text-txt-muted'>
        <span className='inline-flex items-center gap-1 font-semibold text-accent'><Sparkles size={11} /> {tr('教练抽卡')}</span>{' '}
        与选手包完全独立：重复教练转为执教经验（每次 +25），可在「教练组」页面任命为主教练，给全队带来属性加成。
      </div>
    </Panel>
  );
}