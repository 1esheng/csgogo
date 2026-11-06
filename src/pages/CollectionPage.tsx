import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Package, Users } from 'lucide-react';
import { Button, EmptyState, Panel, SectionTitle } from '@/components/ui';
import { PlayerCard } from '@/components/PlayerCard';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { CollectionFiltersBar } from '@/features/collection/CollectionFilters';
import { CardDetailModal } from '@/features/collection/CardDetailModal';
import {
  DEFAULT_FILTERS, applyCollectionFilters, buildCollectionItems, rarityBreakdown,
  type CollectionFilters,
} from '@/features/collection/collectionModel';
import { ROLE_LABEL } from '@/types';
import type { CombatRole } from '@/types';

export function CollectionPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { tr } = useT();
  const navigate = useNavigate();
  const cards = useGameStore((s) => s.cards);
  const squad = useGameStore((s) => s.squad);
  const templates = useGameStore((s) => s.templates)();
  const players = useGameStore((s) => s.players)();
  const assignSlot = useGameStore((s) => s.assignSlot);
  const setIGL = useGameStore((s) => s.setIGL);
  const toast = useGameStore((s) => s.toast);

  const [filters, setFilters] = useState<CollectionFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = useMemo(
    () => buildCollectionItems(cards, templates, players, squad),
    [cards, templates, players, squad],
  );
  const visible = useMemo(() => applyCollectionFilters(all, filters), [all, filters]);
  const counts = useMemo(() => rarityBreakdown(all), [all]);
  const uniqueTemplates = useMemo(() => new Set(cards.map((c) => c.templateId)).size, [cards]);
  const inSquadCount = useMemo(() => all.filter((i) => i.squadRole || i.isIGL).length, [all]);
  const selected = all.find((item) => item.instanceId === selectedId) ?? null;

  const patch = (next: Partial<CollectionFilters>) => setFilters((prev) => ({ ...prev, ...next }));

  const handleAssign = (role: CombatRole) => {
    if (!selected) return;
    const result = assignSlot(role, selected.instanceId);
    if (result.ok) toast(selected.nickname + ' ' + tr('已指派为') + ' ' + tr(ROLE_LABEL[role]) + tr('。'), 'success');
    else toast(result.error ?? tr('无法指派该卡牌。'), 'error');
  };

  const handleSetIGL = () => {
    if (!selected) return;
    setIGL(selected.instanceId);
    toast(selected.nickname + ' ' + tr('已成为队内指挥。'), 'success');
  };

  return (
    <div className='space-y-5'>
      {embedded ? null : (
      <SectionTitle
        title={tr('卡册')}
        subtitle={all.length + ' ' + tr('张卡牌') + ' · ' + uniqueTemplates + ' ' + tr('名不同选手') + ' · ' + inSquadCount + ' ' + tr('人在首发')}
        right={<Button onClick={() => navigate('/packs')}><Package size={15} /> {tr('开启卡包')}</Button>}
      />
      )}

      <CollectionFiltersBar value={filters} onChange={patch} total={all.length} visible={visible.length} counts={counts} />

      {visible.length === 0 ? (
        all.length === 0 ? (
          <Panel>
            <EmptyState
              title={tr('卡册还是空的')}
              hint={tr('卡包是签下选手的唯一途径，每次抽取都会立即入库。')}
              action={<Button onClick={() => navigate('/packs')}>{tr('前往卡包')} <ArrowRight size={14} /></Button>}
            />
          </Panel>
        ) : (
          <Panel>
            <EmptyState
              title={tr('没有符合条件的卡牌')}
              hint={tr('试着放宽搜索词、稀有度、位置或首发筛选。')}
              action={<Button variant='outline' onClick={() => setFilters(DEFAULT_FILTERS)}>{tr('重置筛选')}</Button>}
            />
          </Panel>
        )
      ) : (
        <div className='grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'>
          {visible.map((item) => (
            <div key={item.instanceId} className='flex flex-col items-center gap-1'>
              <PlayerCard
                size='md'
                cornerLabel={item.copies > 1 ? '×' + item.copies : undefined}
                selected={item.instanceId === selectedId}
                onClick={() => setSelectedId(item.instanceId)}
                card={{
                  template: item.template,
                  nickname: item.nickname,
                  countryCode: item.countryCode,
                  ovr: item.ovr,
                  level: item.level,
                  stars: item.stars,
                }}
              />
              <div className='flex h-4 items-center gap-1 text-[12px] font-semibold text-txt-muted'>
                {item.squadRole ? (
                  <span className='inline-flex items-center gap-1 text-accent'><Users size={10} />{tr(ROLE_LABEL[item.squadRole])}</span>
                ) : (
                  <span>{tr('替补')}</span>
                )}
                {item.isIGL ? <span className='text-accent'>&#183; IGL</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <CardDetailModal
        item={selected}
        onClose={() => setSelectedId(null)}
        onAssign={handleAssign}
        onSetIGL={handleSetIGL}
      />
    </div>
  );
}