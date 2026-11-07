import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { GraduationCap, Star, UserPlus } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { COACHES, COACH_MAP, COACH_PACK, COACH_TIER_META, coachTier } from '@/data/coaches';
import { AI_TEAM_MAP } from '@/data/aiTeams';
import { coachEffects } from '@/engine/coach';
import { coachLevel, coachXpProgress, grownCoach, ownedCoachXp } from '@/game/starter';
import { levelText } from '@/i18n';
import { trGameplay } from '@/i18n/areas/gameplay';
import { Badge, Button, Panel, Progress, SectionTitle, Tabs } from '@/components/ui';

type Tab = 'owned' | 'all';

export function CoachPage() {
  const { tr } = useT();
  const { t } = useT();
  const coaches = useGameStore((s) => s.coaches);
  const headCoachId = useGameStore((s) => s.headCoachId);
  const coachXpMap = useGameStore((s) => s.coachXp);
  const setHeadCoach = useGameStore((s) => s.setHeadCoach);
  const openCoachPack = useGameStore((s) => s.openCoachPack);
  const coins = useGameStore((s) => s.club.coins);
  const [tab, setTab] = useState<Tab>('owned');

  // 执教经验 → 等级 → 成长后的执教能力；排序与展示都用成长后的值。
  const ownedRows = useMemo(
    () => (coaches ?? [])
      .map((c) => {
        const base = COACH_MAP[c.coachId];
        if (!base) return null;
        const xp = ownedCoachXp(c, coachXpMap);
        const grown = grownCoach(base, xp) ?? base;
        return { owned: c, info: base, grown, xp, level: coachLevel(xp), progress: coachXpProgress(xp) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.grown.ability - a.grown.ability),
    [coaches, coachXpMap],
  );
  const head = ownedRows.find((x) => x.owned.instanceId === headCoachId) ?? null;
  const allRows = useMemo(() => [...COACHES].sort((a, b) => b.ability - a.ability), []);
  const effects = coachEffects(head ? head.grown : null);
  const bonus = effects.attributeBonus;

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h1 className='font-display text-2xl font-semibold tracking-tight text-txt'>{t('page.coaches.title')}</h1>
          <p className='mt-0.5 text-[13px] text-txt-muted'>
            {tr('共')} {allRows.length} {tr('位真实教练')} · {tr('已签下')} {ownedRows.length} {tr('位')} · {tr('执教能力决定排名与全队加成')}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button size='sm' variant='outline' disabled={coins < COACH_PACK.single} onClick={() => openCoachPack(1)}>
            {tr('单抽教练（')}{COACH_PACK.single}{tr('）')}
          </Button>
          <Button size='sm' disabled={coins < COACH_PACK.ten} onClick={() => openCoachPack(10)}>
            {tr('十连教练（')}{COACH_PACK.ten.toLocaleString()}{tr('）')}
          </Button>
        </div>
      </div>

      <Panel>
        <SectionTitle
          title={tr('现任主教练')}
          subtitle={head ? trGameplay('执教能力') + ' ' + head.grown.ability + ' · ' + head.info.style + tr('型') : tr('尚未任命——任命一位教练可以给全队加成')}
          right={<GraduationCap size={16} className='text-txt-muted' />}
        />
        {head ? (
          <div className='flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-2'>
            <div className='grid h-11 w-11 place-items-center rounded-xl bg-accent/20 font-display text-[15px] font-semibold text-accent'>
              {head.info.nickname.slice(0, 2).toUpperCase()}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='font-display text-[15px] font-semibold text-txt'>{head.info.nickname}</span>
                <Badge tone={head.level > 0 ? 'success' : 'muted'}>{levelText(head.level)}</Badge>
              </div>
              <div className='text-[12px] text-txt-muted'>
                {head.info.country} · {head.info.style} · {trGameplay('执教能力')} {head.grown.ability}
                {head.level > 0 ? ' · ' + trGameplay('成长 +') + head.level : ''}
              </div>
              <div className='mt-1 flex items-center gap-2'>
                <div className='w-32 shrink-0'>
                  <Progress value={head.progress.into} max={head.progress.need} height='h-1' tone='accent' />
                </div>
                <span className='text-[12px] text-txt-muted'>
                  {trGameplay('经验')} {head.progress.into}/{head.progress.need}
                </span>
              </div>
            </div>
            <Badge tone='accent'>{tr('全队属性 +')}{bonus}</Badge>
            {effects.trainingXpPct > 0 ? <Badge tone='success'>{tr('训练经验 +')}{Math.round(effects.trainingXpPct * 100)}%</Badge> : null}
            {effects.opponentAdaptivityCut > 0 ? <Badge tone='muted'>{tr('对手适应力 -')}{Math.round(effects.opponentAdaptivityCut * 100)}%</Badge> : null}
            {effects.economyBonus > 0 ? <Badge tone='muted'>{tr('开局每人 +')}{effects.economyBonus}{tr(' 金币')}</Badge> : null}
            <Button size='sm' variant='ghost' onClick={() => setHeadCoach(null)}>{tr('卸任')}</Button>
          </div>
        ) : (
          <p className='text-[13px] text-txt-muted'>{tr('去下方列表点「任命」即可上任。')}</p>
        )}
      </Panel>

      <Panel>
        <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
          <SectionTitle title={tr('教练排名')} subtitle={tr('按执教能力从高到低')} />
          <Tabs tabs={[{ id: 'owned', label: tr('我的教练') }, { id: 'all', label: tr('全部教练') }]} active={tab} onChange={(id) => setTab(id as Tab)} />
        </div>
        <div className='space-y-1.5'>
          {(tab === 'owned'
            ? ownedRows.map((r) => ({ owned: r.owned, info: r.info, grown: r.grown, level: r.level, xp: r.xp }))
            : allRows.map((info) => ({ owned: null, info, grown: info, level: 0, xp: 0 }))).map((row, index) => {
            const tier = coachTier(row.grown.ability);
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
                <span className='w-7 shrink-0 font-display text-[15px] font-semibold text-txt-muted'>#{index + 1}</span>
                <span
                  className='grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-[12px] font-semibold'
                  style={{ background: meta.color + '22', color: meta.color }}
                >
                  {row.info.nickname.slice(0, 2).toUpperCase()}
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='truncate font-semibold text-txt'>{row.info.nickname}</span>
                    <Badge tone='muted'>{tr(meta.label)}</Badge>
                    {row.level > 0 ? <Badge tone='success'>{levelText(row.level)}</Badge> : null}
                    {isHead ? <Badge tone='accent'>{tr('现任')}</Badge> : null}
                  </div>
                  <div className='truncate text-[12px] text-txt-muted'>
                    {row.info.country} · {row.info.style} · {AI_TEAM_MAP[row.info.teamId ?? '']?.name ?? tr('自由教练')}
                    {row.owned && row.xp > 0 ? trGameplay('执教经验 ') + row.xp : ''}
                  </div>
                </div>
                <div className='w-28 shrink-0'>
                  <Progress value={row.grown.ability} max={100} height='h-1.5' tone='accent' />
                </div>
                <span className='w-8 shrink-0 text-right font-display text-[15px] font-semibold' style={{ color: meta.color }}>
                  {row.grown.ability}
                </span>
                {row.owned ? (
                  <Button size='sm' variant={isHead ? 'ghost' : 'outline'} onClick={() => setHeadCoach(isHead ? null : row.owned!.instanceId)}>
                    {isHead ? tr('卸任') : tr('任命')}
                  </Button>
                ) : (
                  <span className='w-14 shrink-0 text-right text-[12px] text-txt-muted'>{tr('未签下')}</span>
                )}
              </div>
            );
          })}
          {tab === 'owned' && ownedRows.length === 0 ? (
            <p className='rounded-xl border border-dashed border-white/10 p-6 text-center text-[15px] text-txt-muted'>
              <UserPlus size={16} className='mx-auto mb-2 text-txt-muted' />
              {tr('还没有教练——用上方的教练包签一位吧。')}
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}