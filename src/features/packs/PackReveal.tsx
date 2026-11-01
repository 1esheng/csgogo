import React from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge, Button, Panel } from '@/components/ui';
import { PACK_CONFIG, RARITY_TABLE } from '@/data/config';
import type { PullResult } from '@/game/packs';
import { ROLE_LABEL } from '@/types';
import type { PlayerIdentity } from '@/types';

export function PackReveal({
  results, players, skipAnimation, onClose,
}: {
  results: PullResult[];
  players: Record<string, PlayerIdentity>;
  skipAnimation: boolean;
  onClose: () => void;
}) {
  const { tr } = useT();
  const newCount = results.filter((r) => r.isNew).length;
  const duplicates = results.length - newCount;
  const shards = results.reduce((sum, r) => sum + r.shards, 0);
  const coinsBack = Math.round(shards / 4);
  const pityHits = results.filter((x) => x.pity);

  return (
    <Panel className='relative overflow-hidden border-accent/25'>
      <div className='pointer-events-none absolute inset-0 grid-noise opacity-70' />
      <div className='relative flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='label-xs'>{tr('开包结果')}</div>
          <div className='font-display text-xl font-bold text-txt'>
            {results.length} 张卡 · 新卡 {newCount} · 重复 {duplicates}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {duplicates > 0 ? (
            <Badge tone='success'>碎片兑换 +{coinsBack} 金币</Badge>
          ) : null}
          <Button variant='outline' onClick={onClose}>{tr('继续')} <ArrowRight size={14} /></Button>
        </div>
      </div>

      <div className='relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
        {results.map((result, index) => {
          const rarity = RARITY_TABLE[result.rarity];
          const identity = players[result.template.playerId];
          const nickname = identity ? identity.nickname : result.template.playerId;
          return (
            <div
              key={result.template.id + '-' + index}
              className={clsx('relative overflow-hidden rounded-xl border p-3', !skipAnimation && 'animate-fade-up')}
              style={{
                borderColor: rarity.color + '55',
                background: 'linear-gradient(160deg, ' + rarity.color + '22, rgba(21,26,35,0.92))',
                boxShadow: '0 0 26px -10px ' + rarity.glow,
                animationDelay: skipAnimation ? undefined : Math.min(index * 60, 600) + 'ms',
              }}
            >
              <div className='flex items-center justify-between gap-1'>
                <span className='font-display text-[10px] font-black uppercase tracking-[0.18em]' style={{ color: rarity.color }}>
                  {rarity.label}
                {result.pity ? <span className='ml-1 rounded bg-accent/20 px-1 py-0.5 text-[9px] text-accent'>{tr('保底')}</span> : null}
                </span>
                <span
                  className={clsx(
                    'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                    result.isNew ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-txt-muted',
                  )}
                >
                  {result.isNew ? tr('新卡') : tr('重复 · 已入库')}
                </span>
              </div>
              <div className='mt-2 truncate font-display text-sm font-bold text-txt'>{nickname}</div>
              <div className='text-[10px] uppercase tracking-wider text-txt-muted'>
                {ROLE_LABEL[result.template.primaryRole]} · S{result.template.season}
              </div>
              <div className='mt-2 border-t border-white/10 pt-1.5 text-[10px] text-txt-muted'>
                {result.isNew ? tr('已加入卡册') : tr('精通 +') + PACK_CONFIG.masteryPerDuplicate}
              </div>
            </div>
          );
        })}
      </div>

      <div className='relative mt-4 rounded-xl border border-white/10 bg-ink-900/50 p-3 text-[11px] leading-relaxed text-txt-muted'>
        <span className='inline-flex items-center gap-1 font-semibold text-accent'><Sparkles size={11} /> {tr('重复卡牌')}</span>{' '}
        也会入库，可用于「图鉴 → 卡牌合成」升星；仅在同名卡已满 5 星时才折算精通 +{PACK_CONFIG.masteryPerDuplicate}，其碎片按
        4 碎片 = 1 金币兑换{duplicates > 0 ? tr('（本次获得 ') + coinsBack + tr(' 金币）') : ''}。所有新卡已直接进入你的卡册。
      </div>
    </Panel>
  );
}