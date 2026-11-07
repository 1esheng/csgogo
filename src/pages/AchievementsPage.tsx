import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Coins } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, type AchievementCategory } from '@/data/achievements';
import { Badge, Button, Panel, Progress, SectionTitle, StatTile, Tabs } from '@/components/ui';
import { trP3 } from '@/i18n/areas/pillar3';
import { MilestonePanel } from '@/features/career/MilestonePanel';
import { HallOfFame } from '@/features/career/HallOfFame';
import { AlbumPanel } from '@/features/collection/AlbumPanel';
import { EndingBanner } from '@/features/career/EndingBanner';

type PageTab = 'achievements' | 'milestones' | 'albums' | 'hall';

export function AchievementsPage() {
  const { tr, pick } = useT();
  const { t } = useT();
  const snapshotOf = useGameStore((s) => s.snapshot);
  const claimed = useGameStore((s) => s.claimedAchievements);
  const claim = useGameStore((s) => s.claimAchievement);
  const toast = useGameStore((s) => s.toast);
  const snap = snapshotOf();
  const [tab, setTab] = useState<PageTab>('achievements');
  const [category, setCategory] = useState<AchievementCategory | 'all'>('all');

  const rows = useMemo(
    () => ACHIEVEMENTS.map((a) => {
      const value = a.value(snap);
      const done = value >= a.target;
      const isClaimed = claimed.includes(a.id);
      return { ...a, value, done, isClaimed, pct: Math.min(100, (value / a.target) * 100) };
    }).sort((a, b) => Number(b.done && !b.isClaimed) - Number(a.done && !a.isClaimed) || b.pct - a.pct),
    [snap, claimed],
  );

  const visibleRows = category === 'all' ? rows : rows.filter((row) => row.category === category);
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => map.set(row.category, (map.get(row.category) ?? 0) + 1));
    return map;
  }, [rows]);

  const claimedCount = rows.filter((r) => r.isClaimed).length;
  const claimable = rows.filter((r) => r.done && !r.isClaimed).length;
  const totalReward = rows.filter((r) => r.isClaimed).reduce((s, r) => s + r.reward, 0);
  const pendingReward = rows.filter((r) => r.done && !r.isClaimed).reduce((s, r) => s + r.reward, 0);

  const tabs: { id: PageTab; label: string }[] = [
    { id: 'achievements', label: trP3('成就') },
    { id: 'milestones', label: trP3('里程碑') },
    { id: 'albums', label: trP3('收藏册') },
    { id: 'hall', label: trP3('名人堂') },
  ];

  const chips: { id: AchievementCategory | 'all'; label: string }[] = [
    { id: 'all', label: trP3('全部') },
    ...ACHIEVEMENT_CATEGORIES.map((c) => ({ id: c.id, label: pick(c.name, c.nameEn) })),
  ];

  return (
    <div className='space-y-5'>
      <SectionTitle
        title={t('page.achievements.title')}
        subtitle={tr('共 ') + rows.length + tr(' 个里程碑 · 已领取 ') + claimedCount + tr(' 个')}
        right={<Badge tone={claimable > 0 ? 'accent' : 'muted'}>{claimable > 0 ? claimable + tr(' 个可领取') : tr('暂无待领取')}</Badge>}
      />

      <Tabs tabs={tabs} active={tab} onChange={(id) => setTab(id as PageTab)} label={trP3('长期目标')} />

      <EndingBanner />

      {tab === 'achievements' ? (
        <>
          <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
            <StatTile label={tr('已完成')} value={claimedCount + ' / ' + rows.length} hint={tr('已领取的成就')} tone='accent' icon={<Award size={16} />} />
            <StatTile label={tr('待领取')} value={claimable} hint={tr('达成但还没领取')} tone={claimable > 0 ? 'accent' : 'default'} icon={<CheckCircle2 size={16} />} />
            <StatTile label={tr('已获得奖励')} value={totalReward.toLocaleString()} hint={tr('金币')} tone='accent' icon={<Coins size={16} />} />
            <StatTile label={tr('待领取奖励')} value={pendingReward.toLocaleString()} hint={tr('金币')} tone={pendingReward > 0 ? 'accent' : 'default'} icon={<Coins size={16} />} />
          </div>

          <Panel>
            <div className='mb-3 flex flex-wrap gap-2'>
              {chips.map((chip) => {
                const active = category === chip.id;
                const count = chip.id === 'all' ? rows.length : (categoryCounts.get(chip.id) ?? 0);
                return (
                  <button
                    key={chip.id}
                    type='button'
                    aria-pressed={active}
                    onClick={() => setCategory(chip.id)}
                    className={
                      'focus-ring t-colors min-h-8 rounded-lg border px-3 py-1.5 text-[13px] font-semibold '
                      + (active ? 'border-accent/50 bg-accent/15 text-accent' : 'border-white/10 bg-white/5 text-txt-muted hover:text-txt')
                    }
                  >
                    {chip.label} <span className='tabular-nums opacity-70'>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className='space-y-2'>
              {visibleRows.map((row) => (
                <div
                  key={row.id}
                  className={
                    'flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 '
                    + (row.isClaimed
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
                      <span className={'font-display text-[15px] font-semibold ' + (row.isClaimed ? 'text-txt-muted' : 'text-txt')}>{pick(row.name, row.nameEn)}</span>
                      <span className='text-[12px] text-txt-muted'>{pick(row.desc, row.descEn)}</span>
                      <Badge tone='muted'>{pick(
                        ACHIEVEMENT_CATEGORIES.find((c) => c.id === row.category)?.name ?? '',
                        ACHIEVEMENT_CATEGORIES.find((c) => c.id === row.category)?.nameEn ?? '',
                      )}</Badge>
                    </div>
                    <div className='mt-1 flex items-center gap-2'>
                      <span className='min-w-0 flex-1'><Progress value={row.pct} max={100} height='h-1.5' tone={row.done ? 'accent' : 'blue'} /></span>
                      <span className='shrink-0 text-[12px] text-txt-muted'>{Math.min(row.value, row.target)} / {row.target}</span>
                    </div>
                  </div>
                  <span className='inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent'>
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
                      {row.done ? tr('领取') : tr('未达成')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : null}

      {tab === 'milestones' ? <MilestonePanel /> : null}
      {tab === 'albums' ? <AlbumPanel /> : null}
      {tab === 'hall' ? <HallOfFame /> : null}
    </div>
  );
}
