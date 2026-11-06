import React, { useEffect, useRef } from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Lock, Trophy } from 'lucide-react';
import { CAREER_TIERS } from '@/data/config';
import { canEnterTier } from '@/game/career';
import { Badge, Button } from '@/components/ui';

export interface TierError { tier: number; text: string }

export interface TierLadderProps {
  rating: number;
  currentTier: number;
  busyTier: number | null;
  error: TierError | null;
  hasActiveTournament: boolean;
  onEnter: (tier: number) => void;
}

/** 十级联赛阶梯：视口高度固定为 5 行，其余用滚轮下滑查看（含 MAJOR）。 */
export function TierLadder({ rating, currentTier, busyTier, error, hasActiveTournament, onEnter }: TierLadderProps) {
  const { tr } = useT();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const box = scrollRef.current;
    const row = currentRef.current;
    if (!box || !row) return;
    const target = row.offsetTop - box.clientHeight / 2 + row.clientHeight / 2;
    box.scrollTop = Math.max(0, target);
  }, [currentTier]);

  return (
    <div className='relative'>
      <div
        ref={scrollRef}
        className='tier-scroll max-h-[460px] space-y-2 overflow-y-auto pr-1'
      >
        {CAREER_TIERS.map((tier) => {
          const unlocked = canEnterTier(rating, tier.tier);
          const isCurrent = tier.tier === currentTier;
          const rowError = error && error.tier === tier.tier ? error.text : null;
          return (
            <div
              key={tier.tier}
              ref={isCurrent ? currentRef : undefined}
              className={clsx(
                'rounded-xl border px-3 py-2.5 transition-colors duration-150',
                isCurrent
                  ? 'border-accent/50 bg-accent/[0.07]'
                  : unlocked
                    ? 'border-white/10 bg-ink-700/40 hover:border-accent/30'
                    : 'border-white/5 bg-ink-700/20',
              )}
            >
              <div className='flex flex-wrap items-center gap-3'>
                <div
                  className={clsx(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-xs font-semibold',
                    isCurrent ? 'bg-accent text-ink-900' : unlocked ? 'bg-white/10 text-txt' : 'bg-white/5 text-txt-muted',
                  )}
                >
                  {tier.tier + 1}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className={clsx('font-display text-sm font-semibold tracking-wide', unlocked ? 'text-txt' : 'text-txt-muted')}>
                      {tr(tier.name)}
                    </span>
                    {isCurrent ? <Badge tone='accent'>{tr('当前')}</Badge> : null}
                    {!unlocked ? (
                      <Badge tone='muted'>
                        <Lock size={10} /> {tr('需 ')}{tier.ratingFloor}{tr(' 积分')}
                      </Badge>
                    ) : null}
                  </div>
                  <p className='mt-0.5 text-xs leading-snug text-txt-muted'>{tr(tier.blurb)}</p>
                  <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-txt-muted'>
                    <span className='inline-flex items-center gap-1'>
                      <Trophy size={11} className='text-accent' /> {tier.prize.toLocaleString()}{tr(' 金币')}
                    </span>
                    <span>{tier.teams}{tr(' 支队伍')}</span>
                    <span>{tr('评分 ')}{tier.ratingFloor}+</span>
                  </div>
                </div>
                <div className='ml-auto shrink-0'>
                  {unlocked ? (
                    <Button
                      size='sm'
                      variant={isCurrent ? 'primary' : 'outline'}
                      disabled={busyTier !== null}
                      title={hasActiveTournament ? tr('请先完成当前赛事') : undefined}
                      onClick={() => onEnter(tier.tier)}
                    >
                      {busyTier === tier.tier ? tr('进入中…') : tr('进入')} <ChevronRight size={14} />
                    </Button>
                  ) : (
                    <span className='text-[11px] font-semibold text-txt-muted'>{tr('未解锁')}</span>
                  )}
                </div>
              </div>
              {rowError ? (
                <p className='mt-2 rounded-lg border border-danger/30 bg-danger/10 px-2 py-1 text-xs text-danger'>{tr(rowError)}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className='pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-1'>
        <span className='flex items-center gap-1 rounded-full border border-white/10 bg-ink-900/85 px-2 py-0.5 text-[10px] text-txt-muted backdrop-blur'>
          <ChevronDown size={11} /> {tr('向下滚动查看 MAJOR')}
        </span>
      </div>
    </div>
  );
}