import React from 'react';
import { useT } from '@/hooks/useLang';
import { Coins, Dumbbell } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { EmptyState } from '@/components/ui';
import { TRAINING_KIND_LABEL, relativeTime } from '@/features/training/format';

export function TrainingLog() {
  const { tr } = useT();
  const training = useGameStore((s) => s.training);
  if (training.length === 0) {
    return (
      <EmptyState
        title={tr('暂无训练记录')}
        hint={tr('你执行的每次专项训练与训练赛都会记录在这里，包含获得的经验与花费的金币。')}
      />
    );
  }
  return (
    <ul className='space-y-1.5'>
      {training.slice(0, 8).map((record) => (
        <li key={record.id} className='flex items-center gap-2 rounded-xl border border-white/5 bg-ink-900/50 px-2.5 py-1.5'>
          <Dumbbell size={12} className='shrink-0 text-txt-muted' />
          <span className='min-w-0 flex-1 truncate text-[12px] text-txt'>{record.nickname}</span>
          <span className='shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-txt-muted'>
            {tr(TRAINING_KIND_LABEL[record.kind])}
          </span>
          <span className='shrink-0 text-[11px] font-semibold text-emerald-400'>+{record.xpGained} XP</span>
          <span className='flex shrink-0 items-center gap-0.5 text-[11px] text-accent'>
            <Coins size={10} />{record.coinsSpent}
          </span>
          <span className='w-14 shrink-0 text-right text-[10px] text-txt-muted'>{relativeTime(record.at)}</span>
        </li>
      ))}
    </ul>
  );
}
