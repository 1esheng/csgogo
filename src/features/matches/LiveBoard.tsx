import { useState } from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { MapPin, Target, Timer } from 'lucide-react';
import type { MatchState } from '@/types';
import { MAPS } from '@/data/maps';
import { MATCH_CONFIG } from '@/data/config';
import { isMatchOver, targetScore } from '@/engine/match';
import { buildScoreboard } from '@/engine/statistics';
import { Badge, Panel, Tabs } from '@/components/ui';
import { trUiMatch } from '@/i18n/areas/ui-match';
import { TeamRoster } from './TeamPanels';
import { MatchLog, RoundTimeline } from './Timeline';
import { ScoreTable } from './Scoreboard';
import { EconomyTab } from './EconomyTab';
import { MatchOverPanel, RoundOrdersPanel } from './RoundOrders';
import { ROUND_REASON_LABEL, sideTone } from './matchUi';

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

  // 半场：常规赛按「已完成回合数」切半；加时按当前加时块切半。全部来自引擎时间线。
  const completed = match.rounds.length;
  const half = match.overtime === 0
    ? (completed < MATCH_CONFIG.halfRounds ? trUiMatch('上半场') : trUiMatch('下半场'))
    : (
      completed - (MATCH_CONFIG.regulationRounds + (match.overtime - 1) * MATCH_CONFIG.overtimeRoundsPerHalf * 2)
        < MATCH_CONFIG.overtimeRoundsPerHalf
        ? trUiMatch('上半场')
        : trUiMatch('下半场')
    );
  // 边线颜色只表达「这一回合谁拿的」，数据仍然完全来自引擎。
  const roundEdge = lastRound && lastRound.winner
    ? (lastRound.winner === teamA.side ? 'border-l-accent/70' : 'border-l-danger/70')
    : 'border-l-white/15';

  return (
    <div className='space-y-3'>
      {/* 比分：全场最大的元素，双方同字号、同列宽、严格镜像。 */}
      <Panel padded={false} className='overflow-hidden'>
        <div className='grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-4 sm:gap-5'>
          <div className='min-w-0'>
            <div className='label-xs truncate'>{tr('我方')}</div>
            <div
              className={clsx(
                'truncate font-display text-base font-semibold leading-tight sm:text-xl',
                winner === 'A' ? 'text-accent' : 'text-txt',
              )}
            >
              {teamA.name}
            </div>
            <div className='mt-1 flex items-center justify-start'>
              <Badge tone={sideTone(teamA.side)}>{teamA.side}</Badge>
            </div>
          </div>

          <div className='text-center'>
            <div className='font-display text-[44px] font-medium leading-none tracking-tight tabular-nums sm:text-6xl'>
              <span className={winner === 'A' ? 'text-accent' : 'text-txt'}>{teamA.score}</span>
              <span className='mx-1 text-txt-muted/50'>:</span>
              <span className={winner === 'B' ? 'text-danger' : 'text-txt'}>{teamB.score}</span>
            </div>
          </div>

          <div className='min-w-0 text-right'>
            <div className='label-xs truncate'>{tr('对手')}</div>
            <div
              className={clsx(
                'truncate font-display text-base font-semibold leading-tight sm:text-xl',
                winner === 'B' ? 'text-danger' : 'text-txt',
              )}
            >
              {teamB.name}
            </div>
            <div className='mt-1 flex items-center justify-end'>
              <Badge tone={sideTone(teamB.side)}>{teamB.side}</Badge>
            </div>
          </div>
        </div>

        {/* 比分下方一行：当前回合 + 半场 + 目标分。 */}
        <div
          role='status'
          aria-live='polite'
          className='flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-white/[0.06] bg-ink-900/40 px-4 py-1.5 text-[12px] text-txt-muted'
        >
          <span className='font-mono tabular-nums text-txt'>{tr('第 ')}{match.roundNumber}{tr(' 回合')}</span>
          <span aria-hidden className='text-txt-muted/40'>·</span>
          <span>{half}</span>
          {match.overtime > 0 ? <Badge tone='danger'>{tr('加时 ')}{match.overtime}</Badge> : null}
          {over ? <Badge tone='accent'>{tr('终局')}</Badge> : null}
          <span aria-hidden className='text-txt-muted/40'>·</span>
          <span className='inline-flex items-center gap-1'>
            <Target size={10} /> {tr('先到 ')}{targetScore(match)}{tr(' 回合')}
          </span>
        </div>

        <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/[0.06] px-4 py-1.5 text-[12px] text-txt-muted'>
          <span className='inline-flex min-w-0 items-center gap-1'>
            <MapPin size={11} className='shrink-0 text-accent' />
            <span className='truncate'>{map.name} · {tr(map.tagline)}</span>
          </span>
          <span className='inline-flex shrink-0 items-center gap-1'>
            <Timer size={11} /> {tr('已进行 ')}{completed}{tr(' 回合')}
          </span>
        </div>
      </Panel>

      {/* 回合胜负反馈：状态文字 + 一条颜色边线，不引入引擎里没有的指标。 */}
      {lastRound ? (
        <div className={clsx('surface flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 px-3 py-2', roundEdge)}>
          <span className='label-xs shrink-0'>{trUiMatch('回合结果')}</span>
          <Badge tone='neutral'>{tr('第 ')}{lastRound.roundNumber}{tr(' 回合')}</Badge>
          <span className='min-w-0 text-[13px] text-txt'>
            {lastRound.winner
              ? lastRound.winner + tr(' 方拿下 —— ') + tr(ROUND_REASON_LABEL[lastRound.reason])
              : tr('回合进行中')}
          </span>
          <span className='font-mono text-[12px] tabular-nums text-txt-muted'>
            T {lastRound.scoreT} : {lastRound.scoreCT} CT
          </span>
          {lastRound.bombPlanted ? <Badge tone='danger'>{tr('已安包')}</Badge> : null}
          {lastRound.wentToOvertime ? <Badge tone='accent'>{tr('进入加时')}</Badge> : null}
        </div>
      ) : null}

      {/* 窄屏：比分块已置顶，两列名单与中间面板依次堆叠；宽屏三列对称。 */}
      <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]'>
        <TeamRoster team={teamA} label={tr('我方队伍')} />
        <Panel className='flex min-h-[360px] min-w-0 flex-col'>
          <div className='mb-3 min-w-0'>
            <Tabs tabs={tabs} active={tab} onChange={setTab} />
          </div>
          <div className='min-w-0 flex-1'>
            {tab === 'timeline' ? <RoundTimeline match={match} /> : null}
            {tab === 'scoreboard' ? <ScoreTable lines={buildScoreboard(match)} highlightTeamId={teamA.id} /> : null}
            {tab === 'economy' ? <EconomyTab match={match} /> : null}
            {tab === 'log' ? <MatchLog events={match.events} /> : null}
          </div>
        </Panel>
        <TeamRoster team={teamB} label={tr('对手队伍')} />
      </div>

      {over ? <MatchOverPanel match={match} /> : <RoundOrdersPanel match={match} />}
    </div>
  );
}
