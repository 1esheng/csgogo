import React, { useMemo } from 'react';
import { Award, CheckCircle2, Coins } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { ACHIEVEMENTS } from '@/data/achievements';
import { Badge, Button, Panel, Progress, SectionTitle, StatTile } from '@/components/ui';

export function AchievementsPage() {
  const { tr } = useT();
  const { t } = useT();
  const snapshotOf = useGameStore((s) => s.snapshot);
  const claimed = useGameStore((s) => s.claimedAchievements);
  const claim = useGameStore((s) => s.claimAchievement);
  const toast = useGameStore((s) => s.toast);
  const snap = snapshotOf();

  const rows = useMemo(
    () => ACHIEVEMENTS.map((a) => {
      const value = a.value(snap);
      const done = value >= a.target;
      const isClaimed = claimed.includes(a.id);
      return { ...a, value, done, isClaimed, pct: Math.min(100, (value / a.target) * 100) };
    }).sort((a, b) => Number(b.done && !b.isClaimed) - Number(a.done && !a.isClaimed) || b.pct - a.pct),
    [snap, claimed],
  );

  const claimedCount = rows.filter((r) => r.isClaimed).length;
  const claimable = rows.filter((r) => r.done && !r.isClaimed).length;
  const totalReward = rows.filter((r) => r.isClaimed).reduce((s, r) => s + r.reward, 0);
  const pendingReward = rows.filter((r) => r.done && !r.isClaimed).reduce((s, r) => s + r.reward, 0);

  return (
    <div className='space-y-5'>
      <SectionTitle
        title={t('page.achievements.title')}
        subtitle={'共 ' + rows.length + ' 个里程碑 · 已领取 ' + claimedCount + ' 个'}
        right={<Badge tone={claimable > 0 ? 'accent' : 'muted'}>{claimable > 0 ? claimable + ' 个可领取' : '暂无待领取'}</Badge>}
      />

      <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
        <StatTile label={tr('已完成')} value={claimedCount + ' / ' + rows.length} hint={tr('已领取的成就')} tone='accent' icon={<Award size={16} />} />
        <StatTile label={tr('待领取')} value={claimable} hint={tr('达成但还没领取')} tone={claimable > 0 ? 'accent' : 'default'} icon={<CheckCircle2 size={16} />} />
        <StatTile label={tr('已获得奖励')} value={totalReward.toLocaleString()} hint={tr('金币')} tone='accent' icon={<Coins size={16} />} />
        <StatTile label={tr('待领取奖励')} value={pendingReward.toLocaleString()} hint={tr('金币')} tone={pendingReward > 0 ? 'accent' : 'default'} icon={<Coins size={16} />} />
      </div>

      <Panel>
        <div className='space-y-2'>
          {rows.map((row) => (
            <div
              key={row.id}
              className={
                'flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 ' +
                (row.isClaimed
                  ? 'border-white/5 bg-white/[0.02]'
                  : row.done
                    ? 'border-accent/40 bg-accent/[0.07]'
                    : 'border-white/8 bg-ink-700/40')
              }
            >
              <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-lg ' + (row.isClaimed ? 'bg-white/5 text-txt-muted' : row.done ? 'bg-accent/20 text-accent' : 'bg-white/5 text-txt-muted')}>
                {row.isClaimed ? <CheckCircle2 size={16} /> : <Award size={16} />}
              </span>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className={'font-display text-sm font-bold ' + (row.isClaimed ? 'text-txt-muted' : 'text-txt')}>{row.name}</span>
                  <span className='text-[11px] text-txt-muted'>{row.desc}</span>
                </div>
                <div className='mt-1 flex items-center gap-2'>
                  <span className='min-w-0 flex-1'><Progress value={row.pct} max={100} height='h-1.5' tone={row.done ? 'accent' : 'blue'} /></span>
                  <span className='shrink-0 text-[10px] text-txt-muted'>{Math.min(row.value, row.target)} / {row.target}</span>
                </div>
              </div>
              <span className='inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent'>
                <Coins size={12} /> {row.reward.toLocaleString()}
              </span>
              {row.isClaimed ? (
                <Badge tone='muted'>{tr('已领取')}</Badge>
              ) : (
                <Button
                  size='sm'
                  disabled={!row.done}
                  onClick={() => {
                    const res = claim(row.id);
                    if (!res.ok && res.error) toast(res.error, 'error');
                  }}
                >
                  {row.done ? '领取' : '未达成'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
