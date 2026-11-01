import React from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { Sparkles, Star } from 'lucide-react';
import type { CardTemplate, Rarity, Role } from '@/types';
import { ROLE_LABEL } from '@/types';
import { Avatar } from '@/components/Avatar';
import { playerRetired } from '@/data/cards';
import { RARITY_TABLE } from '@/data/config';

export interface PlayerCardView {
  template: CardTemplate;
  nickname: string;
  countryCode: string;
  ovr: number;
  level: number;
  mastery?: number;
  /** 突破星级（1-5），默认 1。 */
  stars?: number;
}

const SIZE = {
  sm: { w: 'w-[152px]', pad: 'p-3', ovr: 'text-2xl', name: 'text-sm', avatar: 62, meta: 'text-[11px]' },
  md: { w: 'w-[188px]', pad: 'p-3.5', ovr: 'text-3xl', name: 'text-[15px]', avatar: 76, meta: 'text-[11px]' },
  lg: { w: 'w-[244px]', pad: 'p-4', ovr: 'text-4xl', name: 'text-lg', avatar: 92, meta: 'text-xs' },
};

export function PlayerCard({
  card, size = 'md', onClick, selected, className, cornerLabel, dimmed,
}: {
  card: PlayerCardView;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  cornerLabel?: string;
  dimmed?: boolean;
}) {
  const { tr } = useT();
  const rarity = RARITY_TABLE[card.template.rarity as Rarity];
  const s = SIZE[size];
  const role: Role = card.template.primaryRole;
  const retired = playerRetired(card.template.playerId);
  const stars = card.stars ?? 1;
  return (
    <button
      type='button'
      onClick={onClick}
      className={clsx(
        'card-face card-sheen group relative flex flex-col gap-2 overflow-hidden rounded-2xl border text-left',
        s.w, s.pad,
        'border-white/10 bg-gradient-to-b from-ink-700 to-ink-900',
        onClick && 'cursor-pointer hover:border-white/25',
        selected && 'ring-2 ring-accent ring-offset-2 ring-offset-ink-900',
        dimmed && 'opacity-55 grayscale-[0.35]',
        className,
      )}
      style={{ boxShadow: '0 14px 34px -18px ' + rarity.glow }}
    >
      <div
        className='pointer-events-none absolute inset-0'
        style={{ background: 'radial-gradient(120% 70% at 50% -10%, ' + rarity.color + '55 0%, transparent 62%)', opacity: 0.55 }}
      />

      <div className='relative flex items-start justify-between gap-2'>
        <div className='flex min-w-0 flex-col'>
          <span className='font-display text-[11px] font-bold uppercase tracking-[0.18em]' style={{ color: rarity.color }}>
            {card.template.rarity}
          </span>
          <span className={clsx('truncate font-semibold tracking-wide text-txt-muted', s.meta)}>{tr(ROLE_LABEL[role])}</span>
        </div>
        <span className='shrink-0 rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] font-bold text-txt'>
          {card.countryCode}
        </span>
      </div>

      <div className='relative flex items-center justify-center rounded-xl py-1'>
        <div
          className='absolute inset-0 rounded-xl opacity-70'
          style={{ background: 'linear-gradient(160deg, ' + rarity.color + '33, transparent 70%)' }}
        />
        <Avatar playerId={card.template.playerId} nickname={card.nickname} size={s.avatar} accent={rarity.color} className='relative' />
      </div>

      <div className='relative flex items-end justify-between gap-2'>
        <div className='min-w-0'>
          <div className={clsx('truncate font-display font-bold tracking-wide text-txt', s.name)}>{card.nickname}</div>
          <div className={clsx('truncate tracking-wider text-txt-muted', s.meta)}>
            {card.template.season}{retired ? ' 生涯终章' : ' 赛季'}
          </div>
        </div>
        <div className='shrink-0 text-right'>
          <div className={clsx('font-display font-black leading-none', s.ovr)} style={{ color: rarity.color }}>{card.ovr}</div>
          <div className='text-[10px] font-semibold uppercase tracking-[0.14em] text-txt-muted'>{tr('综合')}</div>
        </div>
      </div>

      <div className={clsx('relative flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-white/10 pt-2 text-txt-muted', s.meta)}>
        <span className='inline-flex min-w-0 items-center gap-1 font-semibold'>
          <Sparkles size={12} className='shrink-0 text-accent' />
          <span className='truncate'>{card.template.skill.name}</span>
        </span>
        <span className='inline-flex shrink-0 items-center gap-1 font-semibold'>
          <Star size={12} className='text-accent' />
          <span className='whitespace-nowrap'>{card.level} {tr('级')}</span>
          {stars > 1 ? <span className='rounded bg-accent/15 px-1 font-bold text-accent'>{stars}★</span> : null}
        </span>
      </div>

      {cornerLabel ? (
        <span className='absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent'>
          {cornerLabel}
        </span>
      ) : null}
    </button>
  );
}