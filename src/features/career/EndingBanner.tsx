import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { isEndingRecorded, pendingEndings, triggeredEndings } from '@/game/endings';
import { Badge, Button, Panel } from '@/components/ui';
import { trP3 } from '@/i18n/areas/pillar3';

/**
 * 生涯结局横幅：结局只做展示与一次性结算文案，不改变游戏循环。
 * 「记入档案」把记录写进存档（ending: 前缀），「继续游戏」只是本次收起。
 */
export function EndingBanner() {
  const { pick } = useT();
  const snapshotOf = useGameStore((s) => s.snapshot);
  const claimed = useGameStore((s) => s.claimedAchievements);
  const claim = useGameStore((s) => s.claimMilestone);
  const toast = useGameStore((s) => s.toast);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const snap = snapshotOf();

  const reached = triggeredEndings(snap);
  if (reached.length === 0) return null;
  const pending = pendingEndings(snap, claimed).filter((e) => !dismissed.includes(e.id));

  return (
    <Panel className='border border-accent/40'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Flag size={16} className='text-accent' />
          <h2 className='type-title-sm font-display font-semibold tracking-tight text-txt'>{trP3('生涯结局')}</h2>
        </div>
        <Badge tone='accent'>{reached.length + trP3(' 个结局')}</Badge>
      </div>

      <div className='space-y-2'>
        {reached.map((ending) => {
          const recorded = isEndingRecorded(claimed, ending.id);
          const hidden = dismissed.includes(ending.id);
          return (
            <div key={ending.id} className='rounded-xl border border-accent/25 bg-accent/[0.06] px-3 py-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='font-display text-[15px] font-semibold text-txt'>{pick(ending.name, ending.nameEn)}</span>
                {recorded ? <Badge tone='muted'>{trP3('已写入生涯档案')}</Badge> : null}
              </div>
              <p className='mt-1 text-[13px] text-txt-muted'>{pick(ending.desc, ending.descEn)}</p>
              {!recorded && !hidden ? (
                <div className='mt-2 flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    onClick={() => {
                      const res = claim(ending.id);
                      if (!res.ok && res.error) toast(res.error, 'error');
                    }}
                  >
                    {trP3('记入档案')}
                  </Button>
                  <Button size='sm' variant='outline' onClick={() => setDismissed((prev) => [...prev, ending.id])}>
                    {trP3('继续游戏')}
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className='mt-3 text-[12px] leading-relaxed text-txt-muted'>{trP3('结局只是展示与一次性结算文案，不会中断游戏循环。')}</p>
    </Panel>
  );
}
