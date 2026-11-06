import { useT } from '@/hooks/useLang';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, Coins, Crown, History, RotateCcw, Star, TrendingUp, Trophy } from 'lucide-react';
import type { MatchSummary } from '@/types';
import { MAPS } from '@/data/maps';
import { Badge, Button, KeyValue, Panel, SectionTitle, StatTile } from '@/components/ui';
import { MODE_LABEL } from '@/features/career/RecordDetail';
import { ScoreTable } from './Scoreboard';

export function PostMatch({ summary, onExit }: { summary: MatchSummary; onExit: () => void }) {
  const { pick, tr } = useT();
  const navigate = useNavigate();
  const map = MAPS[summary.mapId];
  const mvp = summary.mvp;
  const played = new Date(summary.playedAt);
  // 生涯/赛事对局结束后回到生涯；只有自由对局才回到赛前准备
  const fromCareer = summary.mode === 'career' || summary.mode === 'tournament';

  return (
    <div className='space-y-4'>
      <Panel className={clsx('grid-noise', summary.won ? 'border-accent/30' : 'border-danger/30')}>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <Badge tone={summary.won ? 'accent' : 'danger'}>{summary.won ? tr('胜利') : tr('失利')}</Badge>
              <Badge tone='muted'>{MODE_LABEL[summary.mode]}</Badge>
              <Badge tone='muted'>{pick(summary.roundsPlayed + ' 回合', summary.roundsPlayed + ' rounds')}</Badge>
            </div>
            <h2 className={clsx('mt-2 font-display text-3xl font-semibold tracking-tight', summary.won ? 'text-accent' : 'text-danger')}>
              {summary.won ? tr('比赛获胜') : tr('比赛失利')}
            </h2>
            <div className='mt-1 text-sm text-txt-muted'>
              {summary.teamName}{tr(' 对阵 ')}{summary.opponentName}{tr(' · ')}{map ? map.name : summary.mapId}
            </div>
            <div className='mt-1 text-[11px] text-txt-muted'>
              {tr('比赛时间 ')}{played.toLocaleDateString()}{' '}{played.toLocaleTimeString()}
            </div>
          </div>
          <div className='text-right'>
            <div className='label-xs'>{tr('最终比分')}</div>
            <div className='font-display text-5xl font-semibold leading-none tracking-tight'>
              <span className={summary.won ? 'text-accent' : 'text-txt'}>{summary.scoreFor}</span>
              <span className='mx-1.5 text-2xl text-txt-muted'>:</span>
              <span className={summary.won ? 'text-txt' : 'text-danger'}>{summary.scoreAgainst}</span>
            </div>
          </div>
        </div>
        <div className='mt-4 grid gap-2 sm:grid-cols-3'>
          <StatTile label={tr('获得金币')} value={'+' + summary.coins} icon={<Coins size={18} />} tone='accent' />
          <StatTile label={tr('战队经验')} value={'+' + summary.xp} icon={<TrendingUp size={18} />} />
          <StatTile
            label='MVP'
            value={mvp ? mvp.nickname : '—'}
            hint={mvp ? tr('评分 ') + mvp.rating.toFixed(2) : tr('暂无 MVP')}
            icon={<Star size={18} />}
          />
        </div>
      </Panel>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]'>
        <Panel>
          <SectionTitle title={tr('计分板')} subtitle={tr('下面每个数字都来自这场模拟比赛。')} />
          <ScoreTable
            lines={summary.scoreboard}
            highlightTeamId='player'
            mvpId={mvp ? mvp.cardInstanceId : null}
          />
        </Panel>

        <div className='space-y-4'>
          <Panel>
            <SectionTitle title='MVP' subtitle={mvp ? mvp.nickname : tr('没有突出表现')} />
            {mvp ? (
              <div className='space-y-3'>
                <div className='flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-3 py-2'>
                  <div className='flex items-center gap-2'>
                    <Crown size={16} className='text-accent' />
                    <span className='font-display text-base font-semibold text-txt'>{mvp.nickname}</span>
                  </div>
                  <Badge tone='accent'>{tr('评分 ')}{mvp.rating.toFixed(2)}</Badge>
                </div>
                <KeyValue
                  items={[
                    { label: 'K / D / A', value: mvp.kills + ' / ' + mvp.deaths + ' / ' + mvp.assists },
                    { label: 'ADR', value: mvp.adr.toFixed(1) },
                    { label: 'KAST', value: mvp.kast.toFixed(0) + '%' },
                    { label: 'K/D', value: mvp.kd.toFixed(2) },
                    { label: tr('首杀'), value: mvp.openingKills + ' / ' + mvp.openingDeaths },
                    { label: tr('多杀'), value: mvp.multiKills },
                  ]}
                />
              </div>
            ) : (
              <p className='text-sm text-txt-muted'>{tr('引擎没有为这场比赛记录 MVP。')}</p>
            )}
          </Panel>

          <Panel>
            <SectionTitle title={tr('关键回合')} subtitle={tr('引擎标记出的安包、拆包与团灭回合。')} right={<Trophy size={16} className='text-txt-muted' />} />
            {summary.keyRounds.length === 0 ? (
              <p className='text-sm text-txt-muted'>{tr('本场比赛没有标记出关键回合。')}</p>
            ) : (
              <ul className='space-y-1.5'>
                {summary.keyRounds.map((k) => (
                  <li key={k.roundNumber} className='flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5'>
                    <Badge tone={k.winner === 'T' ? 'accent' : 'neutral'} className='shrink-0'>{k.winner ?? '-'}</Badge>
                    <span className='text-[12px] leading-snug text-txt'>{k.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className='flex flex-wrap justify-end gap-2'>
        <Button variant='outline' onClick={() => navigate('/records')}>
          <History size={15} /> {tr('查看战绩')}
        </Button>
        {fromCareer ? (
          <Button onClick={() => navigate('/career')}>
            <ArrowLeft size={15} /> {tr('返回生涯')}
          </Button>
        ) : (
          <Button onClick={onExit}>
            <RotateCcw size={15} /> {tr('返回赛前准备')}
          </Button>
        )}
      </div>
    </div>
  );
}