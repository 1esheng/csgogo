import React from 'react';
import clsx from 'clsx';
import { Filter } from 'lucide-react';
import { Button, Input, Panel, Select } from '@/components/ui';
import { RARITY_TABLE } from '@/data/config';
import { RARITIES } from '@/types';
import type { Rarity } from '@/types';
import { ROLE_OPTIONS, SORT_OPTIONS, type CollectionFilters } from './collectionModel';

export function CollectionFiltersBar({
  value, onChange, total, visible, counts,
}: {
  value: CollectionFilters;
  onChange: (patch: Partial<CollectionFilters>) => void;
  total: number;
  visible: number;
  counts: Record<Rarity, number>;
}) {
  const toggleRarity = (rarity: Rarity) => {
    const next = value.rarities.includes(rarity)
      ? value.rarities.filter((r) => r !== rarity)
      : [...value.rarities, rarity];
    onChange({ rarities: next });
  };

  return (
    <Panel className='space-y-3'>
      <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_180px_auto] md:items-end'>
        <Input
          label='搜索'
          value={value.query}
          onChange={(query) => onChange({ query })}
          placeholder='选手昵称…'
          maxLength={32}
        />
        <Select label='位置' value={value.role} onChange={(role) => onChange({ role })} options={ROLE_OPTIONS} />
        <Select label='排序' value={value.sort} onChange={(sort) => onChange({ sort })} options={SORT_OPTIONS} />
        <Button
          variant={value.inSquadOnly ? 'primary' : 'outline'}
          onClick={() => onChange({ inSquadOnly: !value.inSquadOnly })}
          className='md:mb-0'
          title='仅显示首发阵容中的卡牌'
        >
          <Filter size={14} /> 首发中
        </Button>
      </div>

      <div className='flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-3'>
        <span className='label-xs mr-1'>稀有度</span>
        {RARITIES.map((rarity) => {
          const info = RARITY_TABLE[rarity];
          const active = value.rarities.includes(rarity);
          return (
            <button
              key={rarity}
              type='button'
              onClick={() => toggleRarity(rarity)}
              title={'切换 ' + info.label + '（已拥有 ' + counts[rarity] + '）'}
              className={clsx(
                'focus-ring rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-150',
                active ? 'text-ink-900' : 'text-txt-muted hover:text-txt',
              )}
              style={active
                ? { background: info.color, borderColor: info.color }
                : { borderColor: info.color + '40', background: info.color + '10' }}
            >
              {info.label}
              <span className={active ? 'ml-1 text-ink-900/70' : 'ml-1 text-txt-muted'}>{counts[rarity]}</span>
            </button>
          );
        })}
        {value.rarities.length > 0 ? (
          <Button variant='subtle' size='sm' onClick={() => onChange({ rarities: [] })}>清除</Button>
        ) : null}
        <span className='ml-auto inline-flex items-center gap-1 text-[11px] text-txt-muted'>
          {visible} / {total} 张卡牌
        </span>
      </div>
    </Panel>
  );
}
