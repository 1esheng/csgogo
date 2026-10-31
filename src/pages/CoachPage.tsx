import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { GraduationCap, Star, UserPlus } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { COACHES, COACH_MAP, COACH_PACK, COACH_TIER_META, coachTier } from '@/data/coaches';
import { AI_TEAM_MAP } from '@/data/aiTeams';
import { coachEffects } from '@/engine/coach';
import { Badge, Button, Panel, Progress, SectionTitle, Tabs } from '@/components/ui';

type Tab = 'owned' | 'all';

export function CoachPage() {
  const { t } = useT();
  const coaches = useGameStore((s) => s.coaches);
  const headCoachId = useGameStore((s) => s.headCoachId);
  const setHeadCoach = useGameStore((s) => s.setHeadCoach);
  const openCoachPack = useGameStore((s) => s.openCoachPack);
  const coins = useGameStore((s) => s.club.coins);
  const [tab, setTab] = useState<Tab>('owned');

  const ownedRows = useMemo(
    () => (coaches ?? [])
      .map((c) => ({ owned: c, info: COACH_MAP[c.coachId] }))
      .filter((x) => x.info)
      .sort((a, b) => b.info!.ability - a.info!.ability),
    [coaches],
  );
  const head = ownedRows.find((x) => x.owned.instanceId === headCoachId) ?? null;
  const allRows = useMemo(() => [...COACHES].sort((a, b) => b.ability - a.ability), []);
  const effects = coachEffects(head ? head.info! : null);
  const bonus = effects.attributeBonus;

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h1 className='font-display text-2xl font-black tracking-tight text-txt'>{t('page.coaches.title')}</h1>
          <p className='mt-0.5 text-xs text-txt-muted'>
            共 {allRows.length} 位真实教练 · 已签下 {ownedRows.length} 位 · 执教能力决定排名与全队加成
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button size='sm' variant='outline' disabled={coins < COACH_PACK.single} onClick={() => openCoachPack(1)}>
            单抽教练（{COACH_PACK.single}）
          </Button>
          <Button size='sm' disabled={coins < COACH_PACK.ten} onClick={() => openCoachPack(10)}>
            十连教练（{COACH_PACK.ten.toLocaleString()}）
          </Button>
        </div>
      </div>

      <Panel>
        <SectionTitle
          title='现任主教练'
          subtitle={head ? '执教能力 ' + head.info!.ability + ' · ' + head.info!.style + '型' : '尚未任命——任命一位教练可以给全队加成'}
          right={<GraduationCap size={16} className='text-txt-muted' />}
        />
        {head ? (
          <div className='flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-2'>
            <div className='grid h-11 w-11 place-items-center rounded-xl bg-accent/20 font-display text-sm font-black text-accent'>
              {head.info!.nickname.slice(0, 2).toUpperCase()}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='font-display text-sm font-bold text-txt'>{head.info!.nickname}</div>
              <div className='text-[11px] text-txt-muted'>
                {head.info!.country} · {head.info!.style} · 能力 {head.info!.ability}
              </div>
            </div>
            <Badge tone='accent'>全队属性 +{bonus}</Badge>
            {effects.trainingXpPct > 0 ? <Badge tone='success'>训练经验 +{Math.round(effects.trainingXpPct * 100)}%</Badge> : null}
            {effects.opponentAdaptivityCut > 0 ? <Badge tone='muted'>对手适应力 -{Math.round(effects.opponentAdaptivityCut * 100)}%</Badge> : null}
            {effects.economyBonus > 0 ? <Badge tone='muted'>开局每人 +{effects.economyBonus} 金币</Badge> : null}
            <Button size='sm' variant='ghost' onClick={() => setHeadCoach(null)}>卸任</Button>
          </div>
        ) : (
          <p className='text-xs text-txt-muted'>去下方列表点「任命」即可上任。</p>
        )}
      </Panel>

      <Panel>
        <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
          <SectionTitle title='教练排名' subtitle='按执教能力从高到低' />
          <Tabs tabs={[{ id: 'owned', label: '我的教练' }, { id: 'all', label: '全部教练' }]} active={tab} onChange={(id) => setTab(id as Tab)} />
        </div>
        <div className='space-y-1.5'>
          {(tab === 'owned' ? ownedRows.map((r) => ({ owned: r.owned, info: r.info! })) : allRows.map((info) => ({ owned: null, info }))).map((row, index) => {
            const tier = coachTier(row.info.ability);
            const meta = COACH_TIER_META[tier];
            const isHead = row.owned && row.owned.instanceId === headCoachId;
            return (
              <div
                key={row.info.id + (row.owned?.instanceId ?? '')}
                className={clsx(
                  'flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2',
                  isHead ? 'border-accent/40 bg-accent/[0.07]' : 'border-white/5 bg-white/[0.02]',
                )}
              >
                <span className='w-7 shrink-0 font-display text-sm font-bold text-txt-muted'>#{index + 1}</span>
                <span
                  className='grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-[11px] font-black'
                  style={{ background: meta.color + '22', color: meta.color }}
                >
                  {row.info.nickname.slice(0, 2).toUpperCase()}
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='truncate font-semibold text-txt'>{row.info.nickname}</span>
                    <Badge tone='muted'>{meta.label}</Badge>
                    {isHead ? <Badge tone='accent'>现任</Badge> : null}
                  </div>
                  <div className='truncate text-[11px] text-txt-muted'>
                    {row.info.country} · {row.info.style} · {AI_TEAM_MAP[row.info.teamId ?? '']?.name ?? '自由教练'}
                    {row.owned && row.owned.xp > 0 ? ' · 执教经验 ' + row.owned.xp : ''}
                  </div>
                </div>
                <div className='w-28 shrink-0'>
                  <Progress value={row.info.ability} max={100} height='h-1.5' tone='accent' />
                </div>
                <span className='w-8 shrink-0 text-right font-display text-sm font-black' style={{ color: meta.color }}>
                  {row.info.ability}
                </span>
                {row.owned ? (
                  <Button size='sm' variant={isHead ? 'ghost' : 'outline'} onClick={() => setHeadCoach(isHead ? null : row.owned!.instanceId)}>
                    {isHead ? '卸任' : '任命'}
                  </Button>
                ) : (
                  <span className='w-14 shrink-0 text-right text-[11px] text-txt-muted'>未签下</span>
                )}
              </div>
            );
          })}
          {tab === 'owned' && ownedRows.length === 0 ? (
            <p className='rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-txt-muted'>
              <UserPlus size={16} className='mx-auto mb-2 text-txt-muted' />
              还没有教练——用上方的教练包签一位吧。
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}