import React from 'react';
import { Sparkles, Star, TrendingUp } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

const TONE = {
  level: { icon: TrendingUp, color: '#4FA3F7', label: '等级提升' },
  star: { icon: Star, color: '#F5A623', label: '突破升星' },
  rare: { icon: Sparkles, color: '#E5484D', label: '稀有掉落' },
} as const;

/** 全局庆祝动画：升级 / 升星 / 稀有掉落时在屏幕中央弹一下。 */
export function Celebration() {
  const celebration = useGameStore((s) => s.celebration);
  const clear = useGameStore((s) => s.clearCelebration);
  if (!celebration) return null;
  const tone = TONE[celebration.tone];
  const Icon = tone.icon;
  return (
    <div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center'>
      <button
        type='button'
        onClick={clear}
        className='motion-panel focus-ring pointer-events-auto rounded-2xl border bg-ink-800/95 px-6 py-4 text-center shadow-card backdrop-blur-md'
        style={{ borderColor: tone.color + '4D' }}
      >
        <div className='flex items-center justify-center gap-2 text-[12px]' style={{ color: tone.color }}>
          <Icon size={13} /> {tone.label}
        </div>
        <div className='mt-1 font-display text-xl font-semibold text-txt'>{celebration.title}</div>
        {celebration.subtitle ? <div className='mt-0.5 text-[13px] text-txt-muted'>{celebration.subtitle}</div> : null}
      </button>
    </div>
  );
}
