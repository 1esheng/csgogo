import React, { useMemo } from 'react';
import { Coins, RefreshCw, ShoppingCart } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { RARITY_TABLE } from '@/data/config';
import { ROLE_LABEL, starsOf } from '@/types';
import { cardOVR } from '@/engine/rating';
import { Avatar } from '@/components/Avatar';
import { Badge, Button, EmptyState, Panel, SectionTitle } from '@/components/ui';

const REFRESH_COST = 400;

export function MarketPage() {
  const market = useGameStore((s) => s.market);
  const club = useGameStore((s) => s.club);
  const refreshMarket = useGameStore((s) => s.refreshMarket);
  const buyOffer = useGameStore((s) => s.buyOffer);
  const toast = useGameStore((s) => s.toast);
  const templates = useGameStore((s) => s.templates)();
  const nameOf = useGameStore((s) => s.nameOf);
  const identities = useGameStore((s) => s.players)();
  const cards = useGameStore((s) => s.cards);

  const rows = useMemo(() => market.map((offer) => {
    const tpl = templates[offer.templateId];
    const ovr = tpl ? cardOVR(tpl, 1, 1) : 0;
    const identity = tpl ? identities[tpl.playerId] : undefined;
    return {
      offer, tpl, ovr,
      nickname: tpl ? nameOf(tpl.playerId) : '未知',
      country: identity?.countryCode ?? '',
      rarity: tpl ? RARITY_TABLE[tpl.rarity] : RARITY_TABLE.N,
      owned: cards.filter((c) => c.templateId === offer.templateId).length,
      stars: cards.filter((c) => c.templateId === offer.templateId).reduce((m, c) => Math.max(m, starsOf(c)), 1),
    };
  }), [market, templates, identities, cards, nameOf]);

  const cheapest = rows.filter((r) => !r.offer.sold).sort((a, b) => a.offer.price - b.offer.price)[0];

  return (
    <div className='space-y-5'>
      <SectionTitle
        title='转会市场'
        subtitle='每周刷新一批可签约的选手，价格随稀有度与综合评分浮动。'
        right={
          <div className='flex items-center gap-2'>
            <Badge tone='accent'>金币 {club.coins.toLocaleString()}</Badge>
            <Button
              size='sm'
              variant='outline'
              disabled={club.coins < REFRESH_COST}
              onClick={() => {
                const res = refreshMarket();
                if (!res.ok && res.error) toast(res.error, 'error');
              }}
            >
              <RefreshCw size={14} /> 刷新（{REFRESH_COST}）
            </Button>
          </div>
        }
      />

      {rows.length === 0 ? (
        <Panel>
          <EmptyState
            title='市场里还没有报价'
            hint={'花 ' + REFRESH_COST + ' 金币刷新一次，会列出 6 名你还没有的选手。'}
            action={<Button onClick={() => { const r = refreshMarket(); if (!r.ok && r.error) toast(r.error, 'error'); }}><RefreshCw size={14} /> 刷新市场</Button>}
          />
        </Panel>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          {rows.map(({ offer, tpl, ovr, nickname, country, rarity, owned, stars }) => {
            if (!tpl) return null;
            return (
              <Panel key={offer.id} className={offer.sold ? 'opacity-55' : ''}>
                <div className='flex items-center gap-3'>
                  <Avatar playerId={tpl.playerId} nickname={nickname} size={44} accent={rarity.color} shape='square' />
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-1.5'>
                      <span className='truncate font-display text-sm font-bold text-txt'>{nickname}</span>
                      <span className='rounded bg-black/40 px-1 text-[9px] font-bold uppercase tracking-wider text-txt-muted'>{country}</span>
                    </div>
                    <div className='text-[11px] text-txt-muted'>
                      {tpl.rarity} · {ROLE_LABEL[tpl.primaryRole]} · {tpl.season} 赛季
                    </div>
                  </div>
                  <span className='font-display text-xl font-black' style={{ color: rarity.color }}>{ovr}</span>
                </div>

                <div className='mt-3 flex items-center justify-between text-[11px] text-txt-muted'>
                  <span>{owned > 0 ? '已拥有 ' + owned + ' 张' + (stars > 1 ? ' · 最高 ' + stars + '★' : '') : '尚未拥有'}</span>
                  <span className='inline-flex items-center gap-1 font-display text-sm font-bold text-accent'>
                    <Coins size={12} /> {offer.price.toLocaleString()}
                  </span>
                </div>

                <Button
                  className='mt-3 w-full'
                  disabled={offer.sold || club.coins < offer.price}
                  onClick={() => {
                    const res = buyOffer(offer.id);
                    if (!res.ok && res.error) toast(res.error, 'error');
                  }}
                >
                  <ShoppingCart size={14} /> {offer.sold ? '已签约' : club.coins < offer.price ? '金币不足' : '签下他'}
                </Button>
              </Panel>
            );
          })}
        </div>
      )}

      {cheapest ? (
        <Panel>
          <div className='text-xs leading-relaxed text-txt-muted'>
            当前最便宜的一笔报价是 <span className='font-semibold text-accent'>{cheapest.nickname}</span>（{cheapest.offer.price.toLocaleString()} 金币，综合 {cheapest.ovr}）。
            签下的卡会直接进入「我的卡牌」，并可用于阵容与升星。
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
