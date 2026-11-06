import { useState } from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { MapPin, Target, Timer } from 'lucide-react';
import type { MatchState } from '@/types';
import { MAPS } from '@/data/maps';
import { isMatchOver, targetScore } from '@/engine/match';
import { buildScoreboard } from '@/engine/statistics';
import { Badge, Panel, Tabs } from '@/components/ui';
import { TeamRoster } from './TeamPanels';
import { MatchLog, RoundTimeline } from './Timeline';
import { ScoreTable } from './Scoreboard';
import { EconomyTab } from './EconomyTab';
import { MatchOverPanel, RoundOrdersPanel } from './RoundOrders';
import { ROUND_REASON_LABEL } from './matchUi';

export function LiveBoard({ match }: { match: MatchState }) {
  const { tr } = useT();
  const [tab, setTab] = useState('timeline');
  const tabs = [
    { id: 'timeline', label: tr('回合时间线') },
    { id: 'scoreboard', label: tr('计分板') },
    { id: 'economy', label: tr('经济') },
    { id: 'log', label: tr('比赛日志') },
  ];
  const over = isMatchOver(match);
  const teamA = match.teams.A;
  const teamB = match.teams.B;
  const map = MAPS[match.mapId];
  const lastRound = match.rounds[match.rounds.length - 1];
  const winner = match.winner;

  return (
    <div className='space-y-3'>
      <Panel padded={false} className='grid-noise overflow-hidden'>
        <div className='flex flex-wrap items-center justify-between gap-4 px-4 py-3'>
          <div className='min-w-0 flex-1'>
            <div className='label-xs'>{tr('我方')}</div>
            <div
              className={clsx(
                'truncate font-display text-lg font-semibold leading-tight',
                winner === 'A' ? 'text-accent' : 'text-txt',
              )}
            >
              {teamA.name}
            </div>
            <div className='mt-1 flex items-center gap-1.5'>
              <Badge tone={teamA.side === 'T' ? 'accent' : 'neutral'}>{teamA.side}</Badge>
              <span className='text-[11px] text-txt-muted'>{tr('已胜 ')}{teamA.score}{tr(' 回合')}</span>
            </div>
          </div>

          <div className='text-center'>
            <div className='font-display text-4xl font-semibold leading-none tracking-tight'>
              <span className={winner === 'A' ? 'text-accent' : 'text-txt'}>{teamA.score}</span>
              <span className='mx-1.5 text-txt-muted'>:</span>
              <span className={winner === 'B' ? 'text-danger' : 'text-txt'}>{teamB.score}</span>
            </div>
            <div className='mt-1.5 flex items-center justify-center gap-1.5'>
              <span className='text-[11px] text-txt-muted'>{tr('第 ')}{match.roundNumber}{tr(' 回合')}</span>
              {match.overtime > 0 ? <Badge tone='danger'>{tr('加时 ')}{match.overtime}</Badge> : null}
              {over ? <Badge tone='accent'>{tr('终局')}</Badge> : null}
            </div>
            <div className='mt-1 flex items-center justify-center gap-1 text-[10px] text-txt-muted'>
              <Target size={10} /> {tr('先到 ')}{targetScore(match)}{tr(' 回合')}
            </div>
          </div>

          <div className='min-w-0 flex-1 text-right'>
            <div className='label-xs'>{tr('对手')}</div>
            <div
              className={clsx(
                'truncate font-display text-lg font-semibold leading-tight',
                winner === 'B' ? 'text-danger' : 'text-txt',
              )}
            >
              {teamB.name}
            </div>
            <div className='mt-1 flex items-center justify-end gap-1.5'>
              <span className='text-[11px] text-txt-muted'>{tr('已胜 ')}{teamB.score}{tr(' 回合')}</span>
              <Badge tone={teamB.side === 'T' ? 'accent' : 'neutral'}>{teamB.side}</Badge>
            </div>
          </div>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-ink-900/50 px-4 py-1.5 text-[11px] text-txt-muted'>
          <span className='inline-flex items-center gap-1'>
            <MapPin size={11} className='text-accent' /> {map.name} · {tr(map.tagline)}
          </span>
          <span className='inline-flex items-center gap-1'>
            <Timer size={11} /> {tr('已进行 ')}{match.rounds.length}{tr(' 回合')}
          </span>
        </div>
      </Panel>

      {lastRound ? (
        <div className='surface flex flex-wrap items-center gap-2 px-3 py-2'>
          <Badge tone='neutral'>{tr('第 ')}{lastRound.roundNumber}{tr(' 回合')}</Badge>
          <span className='text-sm text-txt'>
            {lastRound.winner
              ? lastRound.winner + tr(' 方拿下 —— ') + tr(ROUND_REASON_LABEL[lastRound.reason])
              : tr('回合进行中')}
          </span>
          <span className='font-mono text-xs text-txt-muted'>
            T {lastRound.scoreT} : {lastRound.scoreCT} CT
          </span>
          <span className='ml-auto font-mono text-xs text-txt'>
            {teamA.name} {teamA.score} : {teamB.score} {teamB.name}
          </span>
          {lastRound.bombPlanted ? <Badge tone='danger'>{tr('已安包')}</Badge> : null}
          {lastRound.wentToOvertime ? <Badge tone='accent'>{tr('进入加时')}</Badge> : null}
        </div>
      ) : null}

      <div className='grid gap-3 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,220px)]'>
        <TeamRoster team={teamA} label={tr('我方队伍')} />
        <Panel className='flex min-h-[400px] flex-col'>
          <div className='mb-3'>
            <Tabs tabs={tabs} active={tab} onChange={setTab} />
          </div>
          <div className='flex-1'>
            {tab === 'timeline' ? <RoundTimeline match={match} /> : null}
            {tab === 'scoreboard' ? <ScoreTable lines={buildScoreboard(match)} highlightTeamId={teamA.id} /> : null}
            {tab === 'economy' ? <EconomyTab match={match} /> : null}
            {tab === 'log' ? <MatchLog events={match.events} /> : null}
          </div>
        </Panel>
        <TeamRoster team={teamB} label={tr('对手队伍')} compact />
      </div>

      {over ? <MatchOverPanel match={match} /> : <RoundOrdersPanel match={match} />}
    </div>
  );
}
