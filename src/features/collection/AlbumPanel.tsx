import React, { useMemo, useState } from 'react';
import { Coins, Layers } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import {
  ALBUM_BONUS_CAP, ALBUM_BONUS_PER_ALBUM, buildAlbums, completedAlbumCount,
} from '@/game/albums';
import { Badge, Button, EmptyState, Panel, Progress, SectionTitle, StatTile } from '@/components/ui';
import { trP3 } from '@/i18n/areas/pillar3';

type AlbumFilter = 'all' | 'team' | 'country' | 'complete';

const PAGE_SIZE = 12;

/**
 * 收藏册面板：按战队 / 国籍自动成册，集齐给永久小幅默契加成（见 game/albums.ts）。
 */
export function AlbumPanel() {
  const { pick } = useT();
  const snapshotOf = useGameStore((s) => s.snapshot);
  const snap = snapshotOf();
  const albums = useMemo(() => buildAlbums(snap), [snap]);
  const [filter, setFilter] = useState<AlbumFilter>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const done = completedAlbumCount(albums);
  const bonus = Math.min(ALBUM_BONUS_CAP, done * ALBUM_BONUS_PER_ALBUM);
  const completeCards = albums.reduce((sum, album) => sum + (album.complete ? album.total : 0), 0);
  const totalCards = albums.reduce((sum, album) => sum + album.total, 0);

  const visible = albums
    .filter((album) => (
      filter === 'all' ? true
        : filter === 'complete' ? album.complete
          : album.kind === filter
    ))
    .slice(0, limit);

  const chips: { id: AlbumFilter; label: string }[] = [
    { id: 'all', label: trP3('全部') },
    { id: 'team', label: trP3('战队册') },
    { id: 'country', label: trP3('国籍册') },
    { id: 'complete', label: trP3('已集齐') },
  ];

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
        <StatTile label={trP3('已集齐')} value={done + ' / ' + albums.length} hint={trP3('按战队与国籍自动成册')} tone='accent' icon={<Layers size={16} />} />
        <StatTile label={trP3('集齐奖励')} value={'+' + bonus.toFixed(1)} hint={trP3('永久加成')} tone={bonus > 0 ? 'accent' : 'default'} icon={<Coins size={16} />} />
        <StatTile label={trP3('已拥有')} value={completeCards + ' / ' + totalCards} hint={trP3('本册池内的卡牌')} />
        <StatTile label={trP3('缺少')} value={Math.max(0, totalCards - completeCards)} hint={trP3('还没收集到的卡牌')} />
      </div>

      <Panel>
        <SectionTitle
          title={trP3('收藏册')}
          subtitle={trP3('按战队与国籍自动成册')}
          right={<Badge tone={done > 0 ? 'accent' : 'muted'}>{'+' + bonus.toFixed(1) + ' ' + trP3('团队默契')}</Badge>}
        />

        <div className='mb-3 flex flex-wrap gap-2'>
          {chips.map((chip) => {
            const active = filter === chip.id;
            const count = chip.id === 'all'
              ? albums.length
              : chip.id === 'complete'
                ? done
                : albums.filter((a) => a.kind === chip.id).length;
            return (
              <button
                key={chip.id}
                type='button'
                aria-pressed={active}
                onClick={() => { setFilter(chip.id); setLimit(PAGE_SIZE); }}
                className={
                  'focus-ring t-colors min-h-8 rounded-lg border px-3 py-1.5 text-[13px] font-semibold '
                  + (active ? 'border-accent/50 bg-accent/15 text-accent' : 'border-white/10 bg-white/5 text-txt-muted hover:text-txt')
                }
              >
                {chip.label} <span className='tabular-nums opacity-70'>{count}</span>
              </button>
            );
          })}
        </div>

        <p className='mb-3 text-[12px] leading-relaxed text-txt-muted'>
          {trP3('每集齐一册：阵容默契 +0.5 点（上限 +8 点），直接加到阵容评分使用的默契值上。')}
        </p>

        {visible.length === 0 ? (
          <EmptyState title={trP3('收藏册还是空的')} hint={trP3('开几个卡包，战队册和国籍册会随收藏自动出现。')} />
        ) : (
          <div className='grid gap-2 md:grid-cols-2'>
            {visible.map((album) => (
              <div
                key={album.id}
                className={
                  'rounded-xl border px-3 py-2 '
                  + (album.complete ? 'border-accent/40 bg-accent/[0.07]' : 'border-white/8 bg-ink-700/40')
                }
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className={'font-display text-[14px] font-semibold ' + (album.complete ? 'text-accent' : 'text-txt')}>
                    {pick(album.name, album.nameEn)}
                  </span>
                  <span className='text-[12px] text-txt-muted'>
                    {album.owned} / {album.total}
                    {' · '}
                    {album.complete ? trP3('已集齐') : trP3('未集齐')}
                  </span>
                </div>
                <div className='mt-1.5'>
                  <Progress value={album.owned} max={album.total} height='h-1.5' tone={album.complete ? 'accent' : 'blue'} />
                </div>
                <div className='mt-2 flex flex-wrap gap-1'>
                  {album.entries.map((entry) => (
                    <span
                      key={entry.templateId}
                      className={
                        'rounded-md border px-1.5 py-0.5 text-[11px] '
                        + (entry.owned ? 'border-accent/30 bg-accent/10 text-accent' : 'border-white/10 bg-white/5 text-txt-muted')
                      }
                    >
                      {entry.nickname}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {visible.length < albums.filter((album) => (
          filter === 'all' ? true : filter === 'complete' ? album.complete : album.kind === filter
        )).length ? (
          <div className='mt-3 flex justify-center'>
            <Button size='sm' variant='outline' onClick={() => setLimit((v) => v + PAGE_SIZE)}>
              {trP3('查看更多')}
            </Button>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
