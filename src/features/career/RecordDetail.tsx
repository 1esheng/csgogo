import type { MatchStatLine, MatchSummary } from '@/types';
import { MAPS } from '@/data/maps';
import { Badge, Divider } from '@/components/ui';

export const MODE_LABEL: Record<MatchSummary['mode'], string> = {
  quick: '快速',
  tactical: '战术',
  career: '生涯',
  tournament: '赛事',
};

function splitTeams(lines: MatchStatLine[]) {
  const playerTeamId = lines.find((l) => l.teamId === 'player')?.teamId ?? lines[0]?.teamId;
  return {
    mine: lines.filter((l) => l.teamId === playerTeamId),
    theirs: lines.filter((l) => l.teamId !== playerTeamId),
  };
}

function StatRows({ lines }: { lines: MatchStatLine[] }) {
  const sorted = [...lines].sort((a, b) => b.rating - a.rating);
  return (
    <div className='space-y-1'>
      <div className='grid grid-cols-[minmax(0,1fr)_34px_34px_34px_54px_54px_54px] gap-1 px-2 text-[10px] uppercase tracking-[0.12em] text-txt-muted'>
        <span>选手</span>
        <span className='text-right'>K</span>
        <span className='text-right'>D</span>
        <span className='text-right'>A</span>
        <span className='text-right'>ADR</span>
        <span className='text-right'>KAST</span>
        <span className='text-right'>评分</span>
      </div>
      {sorted.map((line) => (
        <div
          key={line.cardInstanceId + line.playerId}
          className='grid grid-cols-[minmax(0,1fr)_34px_34px_34px_54px_54px_54px] items-center gap-1 rounded-lg bg-white/[0.03] px-2 py-1 text-xs'
        >
          <span className='min-w-0 truncate font-semibold text-txt'>{line.nickname}</span>
          <span className='text-right text-txt'>{line.kills}</span>
          <span className='text-right text-txt-muted'>{line.deaths}</span>
          <span className='text-right text-txt-muted'>{line.assists}</span>
          <span className='text-right text-txt'>{line.adr.toFixed(1)}</span>
          <span className='text-right text-txt-muted'>{Math.round(line.kast)}%</span>
          <span className='text-right font-display font-bold text-accent'>{line.rating.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

/** Full stored scoreboard + key rounds for one match summary. */
export function RecordDetailBody({ summary }: { summary: MatchSummary }) {
  const { mine, theirs } = splitTeams(summary.scoreboard);
  const played = new Date(summary.playedAt).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
        <Badge tone={summary.won ? 'success' : 'danger'}>{summary.won ? '胜利' : '失败'}</Badge>
        <span className='font-display text-lg font-bold text-txt'>
          {summary.scoreFor} : {summary.scoreAgainst}
        </span>
        <span className='text-txt-muted'>对阵 {summary.opponentName}</span>
        <span className='ml-auto text-xs text-txt-muted'>{played}</span>
      </div>

      <div className='grid grid-cols-2 gap-3 text-xs sm:grid-cols-4'>
        <div>
          <div className='label-xs'>地图</div>
          <div className='mt-0.5 font-semibold text-txt'>{MAPS[summary.mapId]?.name ?? summary.mapId}</div>
        </div>
        <div>
          <div className='label-xs'>回合数</div>
          <div className='mt-0.5 font-semibold text-txt'>{summary.roundsPlayed}</div>
        </div>
        <div>
          <div className='label-xs'>模式</div>
          <div className='mt-0.5 font-semibold text-txt'>{MODE_LABEL[summary.mode]}</div>
        </div>
        <div>
          <div className='label-xs'>奖励</div>
          <div className='mt-0.5 font-semibold text-accent'>{summary.coins.toLocaleString()} 金币</div>
        </div>
      </div>

      <Divider />

      <div>
        <div className='mb-2 flex items-center justify-between'>
          <span className='font-display text-sm font-bold text-txt'>{summary.teamName}</span>
          <span className='text-xs text-txt-muted'>你的阵容</span>
        </div>
        {mine.length ? <StatRows lines={mine} /> : <p className='text-xs text-txt-muted'>本场比赛未保存我方选手数据。</p>}
      </div>

      <div>
        <div className='mb-2 flex items-center justify-between'>
          <span className='font-display text-sm font-bold text-txt'>{summary.opponentName}</span>
          <span className='text-xs text-txt-muted'>对手</span>
        </div>
        {theirs.length ? <StatRows lines={theirs} /> : <p className='text-xs text-txt-muted'>本场比赛未保存对手数据。</p>}
      </div>

      <Divider />

      <div>
        <div className='mb-1 text-sm font-semibold text-txt'>MVP</div>
        {summary.mvp ? (
          <div className='rounded-xl border border-accent/25 bg-accent/[0.06] px-3 py-2 text-sm'>
            <span className='font-semibold text-txt'>{summary.mvp.nickname}</span>
            <span className='ml-2 text-xs text-txt-muted'>
              {summary.mvp.kills}/{summary.mvp.deaths}/{summary.mvp.assists} · 评分 {summary.mvp.rating.toFixed(2)}
            </span>
          </div>
        ) : (
          <p className='text-xs text-txt-muted'>本场比赛未记录 MVP。</p>
        )}
      </div>

      <div>
        <div className='mb-1 text-sm font-semibold text-txt'>关键回合</div>
        {summary.keyRounds.length === 0 ? (
          <p className='text-xs text-txt-muted'>本场比赛没有标记下包、拆包或 ACE 回合。</p>
        ) : (
          <ul className='space-y-1'>
            {summary.keyRounds.map((round) => (
              <li
                key={round.roundNumber + round.text}
                className='flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1 text-xs text-txt-muted'
              >
                <span className='font-semibold text-txt'>R{round.roundNumber}</span>
                <span className='min-w-0 flex-1 truncate'>{round.text}</span>
                {round.winner ? (
                  <Badge tone={round.winner === 'T' ? 'accent' : 'neutral'}>{round.winner}</Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
