import React from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { Crown, Plus, Trash2 } from 'lucide-react';
import type { CombatRole } from '@/types';
import { ROLE_LABEL } from '@/types';
import { RARITY_TABLE } from '@/data/config';
import { Progress } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import type { SlotCardInfo } from '@/features/squad/squadModel';

function fitTone(fit: number): 'accent' | 'danger' | 'success' | 'blue' {
  if (fit >= 85) return 'success';
  if (fit >= 65) return 'blue';
  if (fit >= 45) return 'accent';
  return 'danger';
}

export function SlotTile({
  slot, info, isDropTarget, onOpen, onClear, onToggleIGL, onDragOver, onDragLeave, onDrop,
}: {
  slot: CombatRole;
  info: SlotCardInfo | null;
  isDropTarget: boolean;
  onOpen: () => void;
  onClear: () => void;
  onToggleIGL: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  const { tr } = useT();
  const rarity = info ? RARITY_TABLE[info.template.rarity] : null;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      className={clsx(
        'rounded-2xl border p-2 transition-colors duration-150',
        isDropTarget ? 'border-accent/70 bg-accent/10' : 'border-white/5 bg-ink-900/50',
      )}
    >
      <div className='flex items-center gap-2.5'>
        <div className='w-[62px] shrink-0 pl-1'>
          <div className='font-display text-[12px] font-semibold text-txt'>{tr(ROLE_LABEL[slot])}</div>
          <div
            className={clsx(
              'text-[11px] font-semibold ',
              info ? (info.natural ? 'text-emerald-400/90' : 'text-accent/80') : 'text-txt-muted/70',
            )}
          >
            {info ? (info.natural ? tr('本命位') : tr('非本命位')) : tr('空位')}
          </div>
        </div>

        {info && rarity ? (
          <button
            type='button'
            onClick={onOpen}
            className='focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-ink-700/50 p-2 text-left transition-colors hover:border-accent/50 hover:bg-ink-700'
          >
            <Avatar
              playerId={info.template.playerId}
              nickname={info.nickname}
              size={40}
              accent={rarity.color}
              shape='square'
              className='shrink-0'
            />
            <span className='min-w-0 flex-1'>
              <span className='flex items-center gap-1.5'>
                <span className='truncate font-display text-[15px] font-semibold tracking-wide text-txt'>{info.nickname}</span>
                <span className='rounded bg-black/40 px-1 py-0.5 text-[11px] font-semibold text-txt-muted'>
                  {info.countryCode}
                </span>
                <span className='text-[11px] font-semibold ' style={{ color: rarity.color }}>
                  {tr(rarity.label)}
                </span>
              </span>
              <span className='mt-1 flex items-center gap-2'>
                <span className='w-20 shrink-0'>
                  <Progress value={info.fit} tone={fitTone(info.fit)} height='h-1.5' />
                </span>
                <span className='text-[12px] font-semibold text-txt-muted'>{tr('适配')} {info.fit}%</span>
                {info.mapComfort !== null ? (
                  <span className='hidden text-[12px] text-txt-muted sm:inline'>· {tr('地图适应')} {info.mapComfort}</span>
                ) : null}
              </span>
            </span>
            <span className='shrink-0 text-right'>
              <span className='block font-display text-xl font-semibold leading-none' style={{ color: rarity.color }}>
                {info.ovr}
              </span>
              <span className='text-[11px] font-semibold text-txt-muted'>{info.level} {tr('级')}</span>
            </span>
          </button>
        ) : (
          <button
            type='button'
            onClick={onOpen}
            className='focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-4 text-[12px] font-semibold text-txt-muted transition-colors hover:border-accent/60 hover:bg-accent/5 hover:text-accent'
          >
            <Plus size={14} /> {tr('指派')}{tr(ROLE_LABEL[slot])}
          </button>
        )}

        {info ? (
          <div className='flex shrink-0 flex-col gap-1'>
            <button
              type='button'
              onClick={onToggleIGL}
              title={info.isIGL ? tr('取消场上指挥') : tr('设为场上指挥')}
              className={clsx(
                'focus-ring rounded-lg border p-1.5 transition-colors',
                info.isIGL
                  ? 'border-accent/60 bg-accent/20 text-accent'
                  : 'border-white/10 text-txt-muted hover:border-accent/50 hover:text-accent',
              )}
            >
              <Crown size={13} />
            </button>
            <button
              type='button'
              onClick={onClear}
              title={tr('从此位置移除')}
              className='focus-ring rounded-lg border border-white/10 p-1.5 text-txt-muted transition-colors hover:border-danger/60 hover:text-danger'
            >
              <Trash2 size={13} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
