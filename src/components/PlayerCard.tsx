import React from 'react';
import { useT } from '@/hooks/useLang';
import { skillNameEn } from '@/data/cards';
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

/** Width is a ceiling, never a floor: max-w-full lets a 320px two-column grid shrink the card. */
const SIZE = {
  sm: { w: 'w-[152px] max-w-full', pad: 'p-3', ovr: 'text-2xl', name: 'type-note', avatar: 60, meta: 'type-data' },
  md: { w: 'w-[188px] max-w-full', pad: 'p-3.5', ovr: 'text-3xl', name: 'type-body', avatar: 72, meta: 'type-data' },
  lg: { w: 'w-[244px] max-w-full', pad: 'p-4', ovr: 'text-4xl', name: 'type-title-sm', avatar: 88, meta: 'type-note' },
};

export function PlayerCard({
  card, size = 'md', onClick, selected, className, cornerLabel, dimmed, starter,
}: {
  card: PlayerCardView;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  cornerLabel?: string;
  dimmed?: boolean;
  /** 首发阵容里的卡显示一个小徽标。 */
  starter?: boolean;
}) {
  const { tr, pick } = useT();
  const rarity = RARITY_TABLE[card.template.rarity as Rarity];
  const s = SIZE[size];
  const role: Role = card.template.primaryRole;
  const retired = playerRetired(card.template.playerId);
  const stars = card.stars ?? 1;
  const skill = pick(card.template.skill.name, skillNameEn(card.template.skill));
  return (
    <button
      type='button'
      onClick={onClick}
      title={card.nickname}
      aria-pressed={selected === undefined ? undefined : Boolean(selected)}
      className={clsx(
        'card-face card-sheen focus-ring group relative flex flex-col gap-2 overflow-hidden rounded-xl border text-left',
        s.w, s.pad,
        'border-white/10 bg-ink-800',
        // 发丝边 hover 提亮，色相跟随赛季主题；位移仍然是 .card-face 的 -2px，不加第二段动效。
        'hover:border-[color:var(--season-hairline,rgba(255,255,255,0.25))]',
        onClick && 'cursor-pointer hover:bg-ink-700',
        selected && 'border-accent/60 ring-1 ring-accent/50',
        dimmed && 'opacity-55 grayscale-[0.35]',
        className,
      )}
    >
      <span
        aria-hidden='true'
        className={clsx(
          'absolute inset-x-0 top-0 transition-[height,opacity] duration-150 ease-out',
          selected ? 'h-[3px] opacity-100' : 'h-0.5 opacity-80',
        )}
        style={{ backgroundColor: rarity.color }}
      />

      <div className='relative flex items-center justify-between gap-1.5'>
        <span className='flex min-w-0 items-center gap-1.5'>
          <span className='type-data shrink-0 font-semibold tracking-wide text-txt-muted'>{card.template.rarity}</span>
          {starter ? (
            <span className='type-data shrink-0 truncate rounded-[3px] border border-accent/30 px-1 font-semibold text-accent'>
              {tr('首发中')}
            </span>
          ) : null}
        </span>
        {card.countryCode ? (
          <span className='type-data shrink-0 rounded-md border border-white/10 bg-ink-900/60 px-1.5 py-0.5 font-semibold text-txt-muted'>
            {card.countryCode}
          </span>
        ) : null}
      </div>

      <div className='relative flex items-center justify-center'>
        <Avatar playerId={card.template.playerId} nickname={card.nickname} size={s.avatar} accent={rarity.color} />
      </div>

      <div className='relative flex items-end justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <div className={clsx('truncate font-display font-semibold tracking-wide text-txt', s.name)} title={card.nickname}>
            {card.nickname}
          </div>
          <div className={clsx('flex min-w-0 items-baseline gap-1 text-txt-muted', s.meta)}>
            <span className='truncate'>{tr(ROLE_LABEL[role])}</span>
            <span aria-hidden='true' className='shrink-0 text-white/20'>·</span>
            <span className='truncate'>{card.template.season} {retired ? tr('生涯终章') : tr('赛季')}</span>
          </div>
        </div>
        <div className='shrink-0 text-right'>
          <div className={clsx('font-display font-semibold leading-none tabular-nums tracking-[-0.01em] text-txt', s.ovr)}>{card.ovr}</div>
          <div className='type-data mt-1 text-txt-muted'>{tr('综合')}</div>
        </div>
      </div>

      <div className={clsx('relative flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-white/[0.08] pt-2 text-txt-muted', s.meta)}>
        <span className='inline-flex min-w-0 flex-1 items-center gap-1 font-medium'>
          <Sparkles size={12} className='shrink-0 text-txt-muted' aria-hidden='true' />
          <span className='truncate' title={skill}>{skill}</span>
        </span>
        <span className='inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums'>
          <Star size={12} className='shrink-0 text-accent' style={{ color: 'var(--season-accent, #F5A623)' }} aria-hidden='true' />
          <span className='whitespace-nowrap'>{card.level} {tr('级')}</span>
          {stars > 1 ? (
            <span className='whitespace-nowrap rounded-[3px] border border-white/10 px-1 text-accent/90'>{stars}★</span>
          ) : null}
        </span>
      </div>

      {cornerLabel ? (
        <span className='type-data absolute left-1.5 top-1.5 max-w-[calc(100%_-_0.75rem)] truncate rounded-md border border-white/10 bg-ink-900/85 px-1.5 py-0.5 font-semibold text-txt'>
          {cornerLabel}
        </span>
      ) : null}
    </button>
  );
}
