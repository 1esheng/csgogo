import React, { useMemo } from 'react';
import { Award, UserRound } from 'lucide-react';
import type { GameSnapshot } from '@/types';
import { COACH_MAP } from '@/data/coaches';
import { registryOf } from '@/game/lineups';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { Badge, EmptyState, Panel, SectionTitle, StatTile } from '@/components/ui';
import { trP3 } from '@/i18n/areas/pillar3';

export type HofKind = 'player' | 'coach';
export type HofReason = 'retired' | 'former-starter' | 'former-coach';

export interface HallOfFameEntry {
  id: string;
  kind: HofKind;
  name: string;
  reason: HofReason;
  /** 选手：进过首发的场次；教练：执教经验。 */
  metric: number;
}

/** 每张卡在已保存比赛里的首发次数（一份计分板 = 一场）。 */
function startCounts(s: GameSnapshot): Map<string, number> {
  const counts = new Map<string, number>();
  (s.matches ?? []).forEach((m) => {
    (m.scoreboard ?? []).forEach((line) => {
      if (!line.cardInstanceId) return;
      counts.set(line.cardInstanceId, (counts.get(line.cardInstanceId) ?? 0) + 1);
    });
  });
  return counts;
}

/**
 * 名人堂：只从现有存档字段推导，不编造退役事件。
 * 口径见 HallOfFame 组件里的说明文字。
 */
export function buildHallOfFame(s: GameSnapshot): HallOfFameEntry[] {
  const { templates, players } = registryOf({ customTemplates: s.customTemplates, customPlayers: s.customPlayers });
  const starts = startCounts(s);
  const currentStarters = new Set<string>();
  Object.values(s.squad?.slots ?? {}).forEach((id) => { if (id) currentStarters.add(id); });
  if (s.squad?.igl) currentStarters.add(s.squad.igl);

  const byPlayer = new Map<string, HallOfFameEntry>();
  (s.cards ?? []).forEach((card) => {
    const template = templates[card.templateId];
    if (!template) return;
    const player = players[template.playerId];
    const started = starts.get(card.instanceId) ?? 0;
    const retired = Boolean(player?.retired);
    const reason: HofReason | null = retired
      ? 'retired'
      : started > 0 && !currentStarters.has(card.instanceId)
        ? 'former-starter'
        : null;
    if (!reason) return;
    const prev = byPlayer.get(template.playerId);
    const entry: HallOfFameEntry = {
      id: 'player:' + template.playerId,
      kind: 'player',
      name: player?.nickname ?? template.playerId,
      reason,
      metric: started,
    };
    if (!prev || (prev.reason !== 'retired' && entry.reason === 'retired') || entry.metric > prev.metric) {
      byPlayer.set(template.playerId, entry);
    }
  });

  const coaches: HallOfFameEntry[] = (s.coaches ?? [])
    .filter((c) => c.instanceId !== s.headCoachId && (s.coachXp?.[c.instanceId] ?? c.xp) > 0)
    .map((c) => ({
      id: 'coach:' + c.instanceId,
      kind: 'coach' as const,
      name: COACH_MAP[c.coachId]?.nickname ?? c.coachId,
      reason: 'former-coach' as const,
      metric: Math.max(s.coachXp?.[c.instanceId] ?? 0, c.xp),
    }));

  return [...byPlayer.values(), ...coaches].sort((a, b) => (
    Number(b.reason === 'retired') - Number(a.reason === 'retired')
    || b.metric - a.metric
    || a.name.localeCompare(b.name)
  ));
}

export function HallOfFame() {
  const { pick } = useT();
  const snapshotOf = useGameStore((s) => s.snapshot);
  const snap = snapshotOf();
  const entries = useMemo(() => buildHallOfFame(snap), [snap]);

  const retired = entries.filter((e) => e.reason === 'retired').length;
  const starters = entries.filter((e) => e.reason === 'former-starter').length;
  const coaches = entries.filter((e) => e.reason === 'former-coach').length;

  const REASON_LABEL: Record<HofReason, string> = {
    retired: trP3('退役名将'),
    'former-starter': trP3('历史首发'),
    'former-coach': trP3('已离任教练'),
  };

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-3 gap-3'>
        <StatTile label={trP3('退役名将')} value={retired} tone='accent' icon={<Award size={16} />} />
        <StatTile label={trP3('历史首发')} value={starters} icon={<UserRound size={16} />} />
        <StatTile label={trP3('已离任教练')} value={coaches} icon={<Award size={16} />} />
      </div>

      <Panel>
        <SectionTitle
          title={trP3('名人堂')}
          subtitle={trP3('收录口径')}
          right={<Badge tone={entries.length > 0 ? 'accent' : 'muted'}>{entries.length + trP3(' 名')}</Badge>}
        />
        <p className='mb-3 text-[12px] leading-relaxed text-txt-muted'>
          {trP3('口径：本存档没有「退役事件」，所以名人堂收录 ①数据层标注为已退役、且你收藏过的选手；②在已保存的比赛首发记录里出现过、但现在不在首发的选手；③已离任的教练与已解约的青训。')}
        </p>
        {entries.length === 0 ? (
          <EmptyState title={trP3('名人堂还是空的')} hint={trP3('打几场正式比赛、或者收藏一位已退役的传奇，这里就会有人。')} />
        ) : (
          <div className='space-y-2'>
            {entries.map((entry) => (
              <div key={entry.id} className='flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-ink-700/40 px-3 py-2'>
                <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-lg ' + (entry.reason === 'retired' ? 'bg-accent/20 text-accent' : 'bg-white/5 text-txt-muted')}>
                  {entry.kind === 'coach' ? <Award size={16} /> : <UserRound size={16} />}
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='font-display text-[15px] font-semibold text-txt'>{entry.name}</div>
                  <div className='text-[12px] text-txt-muted'>
                    {REASON_LABEL[entry.reason]}
                    {' · '}
                    {entry.kind === 'coach'
                      ? trP3('执教经验') + ' ' + entry.metric
                      : trP3('进过首发的场次') + ' ' + entry.metric}
                  </div>
                </div>
                <Badge tone={entry.reason === 'retired' ? 'accent' : 'muted'}>{REASON_LABEL[entry.reason]}</Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
