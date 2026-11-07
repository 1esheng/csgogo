import React, { useMemo, useState } from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Panel } from '@/components/ui';
import { RARITY_TABLE } from '@/data/config';
import type { PullResult } from '@/game/packs';
import { ROLE_LABEL } from '@/types';
import type { PlayerIdentity, Rarity } from '@/types';

const RANK: Record<Rarity, number> = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
/** 史诗及以上算「稀有卡」，摘要里单独列清单。 */
const RARE_RANK = RANK.SR;
/** 超过这个张数就先给摘要，展开后才渲染长网格。 */
const BULK_THRESHOLD = 10;

/**
 * 开包结果。
 * 真实结算（stores/gameStore.ts › openPack）：每一张结果（含重复卡）都会生成一张真实
 * OwnershipCard 进入收藏，用于「图鉴 → 卡牌合成」升星；不返还金币，也不发精通经验。
 * 因此这里只说已入库 / 可用于升星，不显示任何未到账的金币或精通。
 */
export function PackReveal({
  results, players, skipAnimation, onClose,
}: {
  results: PullResult[];
  players: Record<string, PlayerIdentity>;
  skipAnimation: boolean;
  onClose: () => void;
}) {
  const { tr } = useT();
  const [expanded, setExpanded] = useState(false);
  const isBulk = results.length > BULK_THRESHOLD;
  const showGrid = !isBulk || expanded;

  const stats = useMemo(() => {
    let newCount = 0;
    let top: Rarity = 'N';
    const rares: PullResult[] = [];
    results.forEach((result) => {
      if (result.isNew) newCount += 1;
      if (RANK[result.rarity] > RANK[top]) top = result.rarity;
      if (RANK[result.rarity] >= RARE_RANK) rares.push(result);
    });
    rares.sort((a, b) => RANK[b.rarity] - RANK[a.rarity]);
    return { newCount, duplicates: results.length - newCount, top, rares };
  }, [results]);

  const topMeta = RARITY_TABLE[stats.top];
  const nicknameOf = (result: PullResult) => {
    const identity = players[result.template.playerId];
    return identity ? identity.nickname : result.template.playerId;
  };

  return (
    <Panel className='relative overflow-hidden'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='label-xs'>{tr('开包结果')}</div>
          <div className='mt-1 font-display text-xl font-semibold text-txt'>
            {results.length}{' '}{tr('张卡牌')}
          </div>
        </div>
        <Button variant='outline' size='sm' onClick={onClose}>{tr('继续')} <ArrowRight size={14} /></Button>
      </div>

      <dl className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4'>
        <div className='rounded-lg border border-white/10 bg-ink-900/50 px-3 py-2'>
          <dt className='type-data text-txt-muted'>{tr('总抽取')}</dt>
          <dd className='mt-0.5 font-display text-lg font-semibold tabular-nums text-txt'>{results.length}</dd>
        </div>
        <div className='rounded-lg border border-white/10 bg-ink-900/50 px-3 py-2'>
          <dt className='type-data text-txt-muted'>{tr('新卡')}</dt>
          <dd className='mt-0.5 font-display text-lg font-semibold tabular-nums text-txt'>{stats.newCount}</dd>
        </div>
        <div className='rounded-lg border border-white/10 bg-ink-900/50 px-3 py-2'>
          <dt className='type-data text-txt-muted'>{tr('重复')}</dt>
          <dd className='mt-0.5 font-display text-lg font-semibold tabular-nums text-txt'>{stats.duplicates}</dd>
        </div>
        <div className='rounded-lg border border-white/10 bg-ink-900/50 px-3 py-2'>
          <dt className='type-data text-txt-muted'>{tr('最高稀有度')}</dt>
          <dd className='mt-0.5 flex items-baseline gap-1.5 font-display text-lg font-semibold'>
            <span style={{ color: topMeta.color }}>{results.length > 0 ? stats.top : '—'}</span>
            {results.length > 0 ? <span className='text-[12px] font-normal text-txt-muted'>{tr(topMeta.label)}</span> : null}
          </dd>
        </div>
      </dl>

      {stats.duplicates > 0 ? (
        <p className='mt-2 text-[12px] leading-relaxed text-txt-muted'>
          {tr('其中重复卡')} <span className='font-semibold text-txt'>{stats.duplicates}</span>{' '}
          {tr('张已入库，可用于「图鉴 → 卡牌合成」升星。')}
        </p>
      ) : null}

      <div className='mt-3'>
        <div className='label-xs'>{tr('稀有卡')} · {tr('史诗及以上')}</div>
        {stats.rares.length > 0 ? (
          <ul aria-label={tr('稀有卡')} className='mt-1.5 flex flex-wrap gap-1.5'>
            {stats.rares.map((result, index) => (
              <li
                key={result.template.id + '-rare-' + index}
                className='type-data inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-800 px-1.5 py-0.5 text-txt-muted'
              >
                <span aria-hidden='true' className='h-1.5 w-1.5 shrink-0 rounded-full' style={{ backgroundColor: RARITY_TABLE[result.rarity].color }} />
                <span className='font-semibold text-txt'>{result.rarity}</span>
                <span className='max-w-[9rem] truncate'>{nicknameOf(result)}</span>
                {result.pity ? <span className='shrink-0 rounded-[3px] border border-accent/30 px-1 font-semibold text-accent'>{tr('保底')}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className='mt-1.5 text-[12px] text-txt-muted'>{tr('本次没有抽到史诗及以上的卡牌。')}</p>
        )}
      </div>

      {showGrid ? (
        <ul aria-label={tr('抽到的卡牌')} className='mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5'>
          {results.map((result, index) => {
            const rarityMeta = RARITY_TABLE[result.rarity];
            const nickname = nicknameOf(result);
            return (
              <li
                key={result.template.id + '-' + index}
                className={clsx('relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-ink-800 p-3', !skipAnimation && 'animate-fade-up')}
                style={{ animationDelay: skipAnimation ? undefined : Math.min(index * 60, 600) + 'ms' }}
              >
                <span aria-hidden='true' className='absolute inset-x-0 top-0 h-0.5' style={{ backgroundColor: rarityMeta.color }} />
                <div className='relative flex items-center justify-between gap-1.5'>
                  <span className='type-data shrink-0 font-semibold tracking-wide text-txt-muted'>{result.rarity}</span>
                  {result.pity ? (
                    <span className='type-data shrink-0 rounded-[3px] border border-accent/30 px-1 font-semibold text-accent'>{tr('保底')}</span>
                  ) : null}
                </div>
                <div className='relative mt-2 truncate font-display text-[15px] font-semibold text-txt' title={nickname}>{nickname}</div>
                <div className='type-data relative mt-0.5 truncate text-txt-muted'>
                  {tr(ROLE_LABEL[result.template.primaryRole])} · {result.template.season}
                </div>
                <div className='relative mt-2 border-t border-white/[0.08] pt-1.5 text-[12px]'>
                  <span className={clsx('font-medium', result.isNew ? 'text-txt' : 'text-txt-muted')}>
                    {result.isNew ? tr('新卡 · 已入卡册') : tr('重复 · 已入库')}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {isBulk ? (
        <div className='mt-3'>
          <Button variant='outline' size='sm' aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? <>{tr('收起卡牌')} <ChevronUp size={14} /></> : <>{tr('查看全部卡牌')}（{results.length}）<ChevronDown size={14} /></>}
          </Button>
        </div>
      ) : null}

      <div className='mt-4 rounded-xl border border-white/10 bg-ink-900/50 p-3 text-[12px] leading-relaxed text-txt-muted'>
        <span className='font-semibold text-txt'>{tr('结算说明')}</span>{' '}
        {tr('抽到的每张卡（含重复卡）都直接进入卡册，没有收件箱或二级结算。重复卡是升星材料：三张同名卡在「图鉴 → 卡牌合成」升一星，星级没有上限。本次没有返还金币，也没有额外精通经验。')}
      </div>
    </Panel>
  );
}
