import React from 'react';
import { ArrowRight, Lock, TrendingUp } from 'lucide-react';
import type { CardTemplate, CombatRole } from '@/types';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABEL, ROLE_LABEL } from '@/types';
import { LEVEL_CONFIG, ROLE_GROWTH } from '@/data/config';
import { cardOVR, effectiveAttributes, growthFor } from '@/engine/rating';
import { Badge, Progress } from '@/components/ui';

function appliedPoints(template: CardTemplate, level: number): number {
  const grown = growthFor(template, level);
  return ATTRIBUTE_KEYS.reduce((sum, key) => sum + Math.max(0, grown[key] - template.attributes[key]), 0);
}

export function GrowthPreview({ template, level, stars = 1 }: { template: CardTemplate; level: number; stars?: number }) {
  const maxLevel = LEVEL_CONFIG.maxLevel;
  const capped = level >= maxLevel;
  const nextLevel = Math.min(maxLevel, level + 1);
  const now = effectiveAttributes(template, level);
  const next = effectiveAttributes(template, nextLevel);
  const gains = ATTRIBUTE_KEYS
    .map((key) => ({ key, gain: next[key] - now[key] }))
    .filter((entry) => entry.gain > 0);
  const ovrNow = cardOVR(template, level, stars);
  const ovrNext = cardOVR(template, nextLevel, stars);
  const applied = appliedPoints(template, level);
  const ceiling = appliedPoints(template, maxLevel);
  const order = ROLE_GROWTH[template.primaryRole as CombatRole] ?? ROLE_GROWTH.Entry;

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='label-xs'>成长预估</span>
          <Badge tone={capped ? 'muted' : 'accent'}>{capped ? '等级上限' : level + ' → ' + nextLevel + ' 级'}</Badge>
        </div>
        <div className='flex items-center gap-1.5 font-display text-sm font-bold text-txt'>
          {ovrNow}
          <ArrowRight size={13} className='text-txt-muted' />
          <span className={ovrNext > ovrNow ? 'text-emerald-400' : 'text-txt-muted'}>{ovrNext} OVR</span>
        </div>
      </div>

      {capped ? (
        <p className='flex items-start gap-1.5 rounded-xl border border-white/10 bg-ink-900/50 p-2.5 text-[11px] leading-relaxed text-txt-muted'>
          <Lock size={12} className='mt-0.5 shrink-0' />
          这张卡牌已达到 {maxLevel} 级上限——永久成长已经完成。
        </p>
      ) : gains.length === 0 ? (
        <p className='rounded-xl border border-white/10 bg-ink-900/50 p-2.5 text-[11px] leading-relaxed text-txt-muted'>
          下一级不增加属性点：这张卡已经满级，后续成长只能靠升星。
        </p>
      ) : (
        <div className='grid grid-cols-2 gap-1.5 sm:grid-cols-3'>
          {gains.map((entry) => (
            <div key={entry.key} className='rounded-lg border border-white/5 bg-ink-900/50 px-2 py-1.5'>
              <div className='text-[10px] uppercase tracking-wider text-txt-muted'>{ATTRIBUTE_LABEL[entry.key]}</div>
              <div className='font-display text-sm font-bold text-txt'>
                {now[entry.key]} <span className='text-emerald-400'>+{entry.gain}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className='mb-1 flex items-center justify-between text-[11px] text-txt-muted'>
          <span className='flex items-center gap-1'><TrendingUp size={11} /> 永久属性点</span>
          <span className='font-semibold text-txt'>{applied} / {ceiling}</span>
        </div>
        <Progress value={applied} max={Math.max(1, ceiling)} tone='success' height='h-1.5' />
      </div>

      <div className='space-y-1 text-[11px] leading-relaxed text-txt-muted'>
        <p>
          该位置的成长顺序：{order.map((key) => ATTRIBUTE_LABEL[key]).join(' → ')}。属性点按此顺序投放，因此一张{ROLE_LABEL[template.primaryRole]}卡牌永远不会变成另一个位置的翻版。
        </p>
        <p>
          成长倍率 ×{template.growth.toFixed(2)} 决定这些点数累积的速度。这张卡牌在 1–{maxLevel} 级之间最多可获得 {ceiling} 点永久属性，且每项属性上限为{' '}
          属性没有上限：升级与升星的加成会一直累加。
        </p>
      </div>
    </div>
  );
}