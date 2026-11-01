import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, Crosshair, Trophy, UserCog } from 'lucide-react';
import { useGameStore, aiOpponents } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { TEAM_COACH, TEAM_REGION } from '@/data/teams';
import { CAREER_TIERS, RARITY_TABLE } from '@/data/config';
import type { CombatRole } from '@/types';
import { cardOVR } from '@/engine/rating';
import { Badge, Button, Panel, Progress, SectionTitle } from '@/components/ui';

const ROLE_SHORT: Record<CombatRole, string> = {
  AWPer: '狙击手', Entry: '突破手', Lurker: '自由人', Support: '辅助', Anchor: '主防',
};

export function TeamPage() {
  const { tr } = useT();
  const { teamId } = useParams();
  const navigate = useNavigate();
  const leaders = useGameStore((s) => s.leaders);
  const club = useGameStore((s) => s.club);
  const career = useGameStore((s) => s.career);
  const cards = useGameStore((s) => s.cards);
  const squad = useGameStore((s) => s.squad);
  const teamHonors = useGameStore((s) => s.teamHonors);
  const templates = useGameStore((s) => s.templates)();
  const players = useGameStore((s) => s.players)();

  const isPlayer = teamId === 'player' || !teamId;
  const spec = useMemo(() => aiOpponents().find((t) => t.id === teamId), [teamId]);
  const entry = leaders.find((l) => l.id === (isPlayer ? 'player' : teamId));
  const rankList = [...leaders].sort((a, b) => b.rating - a.rating);
  const rank = rankList.findIndex((l) => l.id === (isPlayer ? 'player' : teamId)) + 1;
  const honors = isPlayer ? (career.honors ?? []) : (teamHonors?.[teamId ?? ''] ?? []);
  const majors = honors.filter((h) => h.tier === 9).length;

  const roster = useMemo(() => {
    if (isPlayer) {
      return (['AWPer', 'Entry', 'Lurker', 'Support', 'Anchor'] as CombatRole[]).map((role) => {
        const id = squad.slots[role];
        const card = id ? cards.find((c) => c.instanceId === id) : undefined;
        const tpl = card ? templates[card.templateId] : undefined;
        return tpl ? { role, tpl, card } : null;
      }).filter((x): x is { role: CombatRole; tpl: NonNullable<typeof x>['tpl']; card: NonNullable<typeof x>['card'] } => Boolean(x));
    }
    if (!spec) return [];
    return spec.lineup.map((slot) => ({ role: slot.role, tpl: templates[slot.templateId], card: null }));
  }, [isPlayer, spec, squad.slots, cards, templates]);

  const name = isPlayer ? club.name : spec?.name ?? '未知战队';
  const region = isPlayer ? '本地' : TEAM_REGION[teamId ?? ''] ?? '国际';
  const coach = isPlayer ? '（未设置）' : TEAM_COACH[teamId ?? ''] ?? '（暂无资料）';
  const avgAge = roster.length
    ? Math.round(roster.reduce((sum, r) => sum + (players[r.tpl!.playerId]?.age ?? 24), 0) / roster.length * 10) / 10
    : null;
  const weeks = entry?.weeks ?? 0;
  const ovr = roster.length
    ? Math.round(roster.reduce((sum, r) => sum + cardOVR(r.tpl!, r.card?.level ?? 4, r.card?.stars ?? 1), 0) / roster.length)
    : 0;

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <Button size='sm' variant='ghost' onClick={() => navigate(-1)}><ArrowLeft size={14} /> {tr('返回')}</Button>
      </div>

      <Panel className='relative overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 grid-noise opacity-50' />
        <div className='relative flex flex-wrap items-center gap-4'>
          <div className='grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 font-display text-xl font-black text-accent'>
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className='min-w-0 flex-1'>
            <div className='text-[11px] uppercase tracking-[0.18em] text-txt-muted'>{region}</div>
            <h1 className='font-display text-2xl font-black tracking-tight text-txt'>{name}</h1>
            <div className='mt-1 flex flex-wrap items-center gap-2 text-[11px] text-txt-muted'>
              <Badge tone='muted'>积分 {entry?.rating ?? '—'}</Badge>
              <Badge tone='muted'>阵容战力 {ovr}</Badge>
              <Badge tone={majors > 0 ? 'accent' : 'neutral'}>MAJOR 冠军 ×{majors}</Badge>
            </div>
          </div>
        </div>

        <div className='relative mt-4 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2'>
          <Row label={tr('Valve 排名')} value={'#' + (rank || '—') + ' / ' + leaders.length} />
          <Row label={tr('世界排名')} value={'#' + (rank || '—')} />
          <Row label={tr('留在前 30 的周数')} value={String(weeks)} />
          <Row label={tr('平均年龄')} value={avgAge ? avgAge.toFixed(1) : '—'} />
          <Row label={tr('战绩')} value={(entry ? (entry.wins + ' 胜 ' + entry.losses + ' 负') : '—')} />
          <Row label={tr('教练')} value={coach} />
        </div>
      </Panel>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]'>
        <Panel>
          <SectionTitle title={tr('现役阵容')} subtitle={roster.length + ' 人'} right={<Crosshair size={16} className='text-txt-muted' />} />
          <div className='space-y-1.5'>
            {roster.map((r) => {
              const identity = players[r.tpl!.playerId];
              const rarity = RARITY_TABLE[r.tpl!.rarity];
              return (
                <div key={r.role + r.tpl!.id} className='flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2'>
                  <span className='w-14 shrink-0 text-[11px] text-txt-muted'>{ROLE_SHORT[r.role]}</span>
                  <span className='min-w-0 flex-1 truncate font-semibold text-txt'>{identity?.nickname ?? r.tpl!.playerId}</span>
                  <Badge tone='muted'>{identity?.country ?? '—'}</Badge>
                  <span className='w-8 shrink-0 text-right text-[11px] text-txt-muted'>{identity?.age ?? '—'} 岁</span>
                  <span className='w-8 shrink-0 text-right font-display text-sm font-black' style={{ color: rarity.color }}>
                    {cardOVR(r.tpl!, r.card?.level ?? 4, r.card?.stars ?? 1)}
                  </span>
                </div>
              );
            })}
            {roster.length === 0 ? <p className='text-xs text-txt-muted'>{tr('暂无阵容数据。')}</p> : null}
          </div>
        </Panel>

        <div className='space-y-4'>
          <Panel>
            <SectionTitle title={tr('战队荣誉')} subtitle={'共 ' + honors.length + ' 座奖杯'} right={<Trophy size={16} className='text-txt-muted' />} />
            {honors.length === 0 ? (
              <p className='text-xs text-txt-muted'>{tr('还没有夺冠记录。')}</p>
            ) : (
              <div className='space-y-1.5'>
                {honors.slice().reverse().map((h) => (
                  <div key={h.id} className='flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs'>
                    <Trophy size={13} className={h.tier === 9 ? 'text-accent' : 'text-txt-muted'} />
                    <span className='min-w-0 flex-1 truncate text-txt'>{h.name}</span>
                    <Badge tone={h.tier === 9 ? 'accent' : 'muted'}>{CAREER_TIERS[h.tier]?.name ?? '赛事'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionTitle title={tr('奖杯墙')} subtitle={tr('按档位统计')} />
            <div className='space-y-1.5'>
              {CAREER_TIERS.map((tier) => {
                const count = honors.filter((h) => h.tier === tier.tier).length;
                return (
                  <div key={tier.tier} className='flex items-center gap-2 text-xs'>
                    <span className='w-24 shrink-0 text-txt-muted'>{tier.name}</span>
                    <span className='min-w-0 flex-1'><Progress value={Math.min(100, count * 20)} height='h-1.5' tone='accent' /></span>
                    <span className='w-6 text-right font-semibold text-txt'>{count}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between gap-3 border-b border-white/5 py-1 last:border-0'>
      <span className='text-txt-muted'>{label}</span>
      <span className='font-semibold text-txt'>{value}</span>
    </div>
  );
}