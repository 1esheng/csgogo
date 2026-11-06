import React, { useState } from 'react';
import { Coins } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { SectionTitle, Tabs } from '@/components/ui';
import { RosterTraining } from '@/features/training/RosterTraining';
import { AcademyPanel } from '@/features/training/AcademyPanel';

const TABS = [
  { id: 'roster', label: '阵容训练' },
  { id: 'academy', label: '青训营' },
];

export function TrainingPage() {
  const { tr } = useT();
  const [tab, setTab] = useState('roster');
  const coins = useGameStore((s) => s.club.coins);
  return (
    <div className='space-y-5'>
      <SectionTitle
        title={tr('训练')}
        subtitle={tr('把金币转化为卡牌的永久成长——或经营你的青训营。')}
        right={(
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <div className='flex items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent'>
              <Coins size={14} /> {coins.toLocaleString()}
            </div>
            <Tabs tabs={TABS.map((item) => ({ ...item, label: tr(item.label) }))} active={tab} onChange={setTab} />
          </div>
        )}
      />
      {tab === 'academy' ? <AcademyPanel /> : <RosterTraining />}
    </div>
  );
}
