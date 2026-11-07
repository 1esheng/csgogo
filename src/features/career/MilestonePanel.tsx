import React, { useMemo } from 'react';
import { Coins, Target, Trophy } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { milestoneRows, milestoneSummary } from '@/game/milestones';
import { Badge, Button, Panel, Progress, SectionTitle, StatTile } from '@/components/ui';
import { trP3 } from '@/i18n/areas/pillar3';

/**
 * 王朝里程碑面板：跨赛季长期目标的进度、一次性金币奖励与领取。
 * 判定与奖励都在 game/milestones.ts，这里只负责展示。
 */
export function MilestonePanel() {
  const { pick } = useT();
  const snapshotOf = useGameStore((s) => s.snapshot);
  const claimed = useGameStore((s) => s.claimedAchievements);
  const claim = useGameStore((s) => s.claimMilestone);
  const toast = useGameStore((s) => s.toast);
  const snap = snapshotOf();

  const rows = useMemo(() => milestoneRows(snap, claimed), [snap, claimed]);
  const summary = useMemo(() => milestoneSummary(rows), [rows]);

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
        <StatTile
          label={trP3('达成里程碑')}
          value={summary.reached + ' / ' + rows.length}
          hint={trP3('跨赛季的长期目标，达成后一次性领取金币。')}
          tone='accent'
          icon={<Trophy size={16} />}
        />
        <StatTile
          label={trP3('待领取')}
          value={summary.claimable}
          hint={trP3('可领取奖励')}
          tone={summary.claimable > 0 ? 'accent' : 'default'}
          icon={<Target size={16} />}
        />
        <StatTile
          label={trP3('累计已领')}
          value={summary.coinsClaimed.toLocaleString()}
          hint={trP3('金币')}
          tone='accent'
          icon={<Coins size={16} />}
        />
        <StatTile
          label={trP3('待领取奖励')}
          value={summary.coinsClaimable.toLocaleString()}
          hint={trP3('金币')}
          tone={summary.coinsClaimable > 0 ? 'accent' : 'default'}
          icon={<Coins size={16} />}
        />
      </div>

      <Panel>
        <SectionTitle
          title={trP3('王朝里程碑')}
          subtitle={trP3('跨赛季的长期目标，达成后一次性领取金币。')}
          right={<Badge tone={summary.claimable > 0 ? 'accent' : 'muted'}>{summary.claimable > 0 ? summary.claimable + trP3(' 个可领取') : trP3('暂无待领取')}</Badge>}
        />
        <div className='space-y-2'>
          {rows.map((row) => (
            <div
              key={row.milestone.id}
              className={
                'flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 '
                + (row.claimed
                  ? 'border-white/5 bg-white/[0.02]'
                  : row.done
                    ? 'border-accent/40 bg-accent/[0.07]'
                    : 'border-white/8 bg-ink-700/40')
              }
            >
              <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-lg ' + (row.claimed ? 'bg-white/5 text-txt-muted' : row.done ? 'bg-accent/20 text-accent' : 'bg-white/5 text-txt-muted')}>
                <Trophy size={16} />
              </span>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className={'font-display text-[15px] font-semibold ' + (row.claimed ? 'text-txt-muted' : 'text-txt')}>
                    {pick(row.milestone.name, row.milestone.nameEn)}
                  </span>
                  <span className='text-[12px] text-txt-muted'>{pick(row.milestone.desc, row.milestone.descEn)}</span>
                </div>
                <div className='mt-1 flex items-center gap-2'>
                  <span className='min-w-0 flex-1'>
                    <Progress value={row.pct} max={100} height='h-1.5' tone={row.done ? 'accent' : 'blue'} />
                  </span>
                  <span className='shrink-0 text-[12px] text-txt-muted'>
                    {Math.min(row.value, row.milestone.target)} / {row.milestone.target}
                  </span>
                </div>
              </div>
              <span className='inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent'>
                <Coins size={12} /> {row.milestone.reward.toLocaleString()}
              </span>
              {row.claimed ? (
                <Badge tone='muted'>{trP3('已领取')}</Badge>
              ) : (
                <Button
                  size='sm'
                  disabled={!row.done}
                  onClick={() => {
                    const res = claim(row.milestone.id);
                    if (!res.ok && res.error) toast(res.error, 'error');
                  }}
                >
                  {row.done ? trP3('领取') : trP3('未达成')}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
