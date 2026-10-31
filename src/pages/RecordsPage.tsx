import { useMemo, useState } from 'react';
import { Coins, Flame, History, Swords, Target } from 'lucide-react';
import type { MapId, MatchSummary } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { MAPS } from '@/data/maps';
import { Badge, Button, EmptyState, Modal, Panel, SectionTitle, StatTile } from '@/components/ui';
import { MODE_LABEL, RecordDetailBody } from '@/features/career/RecordDetail';

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function RecordsPage() {
  const matches = useGameStore((s) => s.matches);
  const [selected, setSelected] = useState<MatchSummary | null>(null);
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => {
    const total = matches.length;
    const wins = matches.filter((m) => m.won).length;
    const coins = matches.reduce((sum, m) => sum + m.coins, 0);

    const byMap = new Map<MapId, { played: number; wins: number }>();
    matches.forEach((m) => {
      const entry = byMap.get(m.mapId) ?? { played: 0, wins: 0 };
      entry.played += 1;
      if (m.won) entry.wins += 1;
      byMap.set(m.mapId, entry);
    });
    let bestMap: { mapId: MapId; rate: number; played: number } | null = null;
    for (const [mapId, value] of Array.from(byMap.entries())) {
      const rate = value.wins / Math.max(1, value.played);
      if (!bestMap || rate > bestMap.rate || (rate === bestMap.rate && value.played > bestMap.played)) {
        bestMap = { mapId, rate, played: value.played };
      }
    }

    let streak = 0;
    let bestStreak = 0;
    [...matches].reverse().forEach((m) => {
      if (m.won) {
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
      }
    });

    return { total, wins, coins, bestMap, bestStreak };
  }, [matches]);

  const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;

  return (
    <div className='space-y-5'>
      <SectionTitle title='战绩' subtitle='本存档的比赛记录，最新在前。' />

      <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
        <StatTile label='比赛场次' value={stats.total} hint={stats.wins + ' 胜'} icon={<Swords size={16} />} />
        <StatTile label='胜率' value={stats.total ? Math.round(winRate) + '%' : '—'} tone={winRate >= 50 ? 'accent' : 'default'} hint={'共 ' + stats.total + ' 场'} icon={<Target size={16} />} />
        <StatTile
          label='最擅长地图'
          value={stats.bestMap ? MAPS[stats.bestMap.mapId]?.name ?? stats.bestMap.mapId : '—'}
          hint={stats.bestMap ? Math.round(stats.bestMap.rate * 100) + '% / ' + stats.bestMap.played + ' 场' : '暂无比赛'}
          icon={<History size={16} />}
        />
        <StatTile label='最长连胜' value={stats.bestStreak} hint={'累计获得 ' + stats.coins.toLocaleString() + ' 金币'} icon={<Flame size={16} />} />
      </div>

      <Panel>
        <SectionTitle title='比赛记录' subtitle='选择一场比赛查看已保存的计分板。' />
        {matches.length === 0 ? (
          <EmptyState
            title='暂无比赛记录'
            hint='在训练赛或生涯完成一场比赛，其摘要（含 MVP 与关键回合）就会出现在这里。'
          />
        ) : (
          <div className='space-y-1.5'>
            {(showAll ? matches : matches.slice(0, 15)).map((match) => (
              <button
                key={match.id}
                onClick={() => setSelected(match)}
                className='focus-ring group flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/5 bg-ink-700/40 px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-ink-700/70'
              >
                <Badge tone={match.won ? 'success' : 'danger'}>{match.won ? '胜' : '负'}</Badge>
                <span className='font-display text-base font-bold text-txt'>
                  {match.scoreFor}
                  <span className='text-txt-muted'>:</span>
                  {match.scoreAgainst}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-semibold text-txt'>{match.opponentName}</span>
                  <span className='text-[11px] text-txt-muted'>
                    {MAPS[match.mapId]?.name ?? match.mapId} · {match.roundsPlayed} 回合 · {MODE_LABEL[match.mode]}
                  </span>
                </span>
                <span className='hidden text-xs text-txt-muted sm:block'>
                  {match.mvp ? 'MVP ' + match.mvp.nickname + ' · ' + match.mvp.rating.toFixed(2) : '无 MVP'}
                </span>
                <span className='inline-flex items-center gap-1 text-xs font-semibold text-accent'>
                  <Coins size={12} /> {match.coins.toLocaleString()}
                </span>
                <span className='text-[11px] text-txt-muted'>{formatDate(match.playedAt)}</span>
              </button>
            ))}
          </div>
        )}
        {matches.length > 15 ? (
          <div className='mt-2 text-center'>
            <Button variant='subtle' size='sm' onClick={() => setShowAll(!showAll)}>
              {showAll ? '收起' : '查看全部 ' + matches.length + ' 场比赛'}
            </Button>
          </div>
        ) : null}
        <p className='mt-3 text-[11px] leading-relaxed text-txt-muted'>
          每场比赛仅保存摘要数据。完整回放（含每个回合事件）只在 IndexedDB 中保留最近 20 场，本页面不会加载。
        </p>
      </Panel>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        wide
        title={selected ? '对阵 ' + selected.opponentName : '比赛'}
      >
        {selected ? <RecordDetailBody summary={selected} /> : null}
      </Modal>
    </div>
  );
}