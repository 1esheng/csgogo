import { useMemo, useState } from 'react';
import { Coins, Flame, History, Swords, Target } from 'lucide-react';
import type { MapId, MatchSummary } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { MAPS } from '@/data/maps';
import { Badge, Button, EmptyState, Modal, Panel, SectionTitle, StatTile } from '@/components/ui';
import { MODE_LABEL, RecordDetailBody } from '@/features/career/RecordDetail';

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function RecordsPage() {
  const { tr } = useT();
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
      <SectionTitle title={tr('战绩')} subtitle={tr('本存档的比赛记录，最新在前。')} />

      <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
        <StatTile label={tr('比赛场次')} value={stats.total} hint={stats.wins + tr(' 胜')} icon={<Swords size={16} />} />
        <StatTile label={tr('胜率')} value={stats.total ? Math.round(winRate) + '%' : '—'} tone={winRate >= 50 ? 'accent' : 'default'} hint={tr('共 ') + stats.total + tr(' 场')} icon={<Target size={16} />} />
        <StatTile
          label={tr('最擅长地图')}
          value={stats.bestMap ? MAPS[stats.bestMap.mapId]?.name ?? stats.bestMap.mapId : '—'}
          hint={stats.bestMap ? Math.round(stats.bestMap.rate * 100) + '% / ' + stats.bestMap.played + tr(' 场') : tr('暂无比赛')}
          icon={<History size={16} />}
        />
        <StatTile label={tr('最长连胜')} value={stats.bestStreak} hint={tr('累计获得 ') + stats.coins.toLocaleString() + tr(' 金币')} icon={<Flame size={16} />} />
      </div>

      <Panel>
        <SectionTitle title={tr('比赛记录')} subtitle={tr('选择一场比赛查看已保存的计分板。')} />
        {matches.length === 0 ? (
          <EmptyState
            title={tr('暂无比赛记录')}
            hint={tr('在训练赛或生涯完成一场比赛，其摘要（含 MVP 与关键回合）就会出现在这里。')}
          />
        ) : (
          <div className='space-y-1.5'>
            {(showAll ? matches : matches.slice(0, 15)).map((match) => (
              <button
                key={match.id}
                onClick={() => setSelected(match)}
                className='focus-ring group flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/5 bg-ink-700/40 px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-ink-700/70'
              >
                <Badge tone={match.won ? 'success' : 'danger'}>{match.won ? tr('胜') : tr('负')}</Badge>
                <span className='font-display text-base font-semibold text-txt'>
                  {match.scoreFor}
                  <span className='text-txt-muted'>:</span>
                  {match.scoreAgainst}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-[15px] font-semibold text-txt'>{match.opponentName}</span>
                  <span className='text-[12px] text-txt-muted'>
                    {MAPS[match.mapId]?.name ?? match.mapId} · {match.roundsPlayed}{tr(' 回合 · ')}{tr(MODE_LABEL[match.mode])}
                  </span>
                </span>
                <span className='hidden text-[13px] text-txt-muted sm:block'>
                  {match.mvp ? 'MVP ' + match.mvp.nickname + ' · ' + match.mvp.rating.toFixed(2) : tr('无 MVP')}
                </span>
                <span className='inline-flex items-center gap-1 text-[13px] font-semibold text-accent'>
                  <Coins size={12} /> {match.coins.toLocaleString()}
                </span>
                <span className='text-[12px] text-txt-muted'>{formatDate(match.playedAt)}</span>
              </button>
            ))}
          </div>
        )}
        {matches.length > 15 ? (
          <div className='mt-2 text-center'>
            <Button variant='subtle' size='sm' onClick={() => setShowAll(!showAll)}>
              {showAll ? tr('收起') : tr('查看全部 ') + matches.length + tr(' 场比赛')}
            </Button>
          </div>
        ) : null}
        <p className='mt-3 text-[12px] leading-relaxed text-txt-muted'>
          {tr('每场比赛仅保存摘要数据。完整回放（含每个回合事件）只在 IndexedDB 中保留最近 20 场，本页面不会加载。')}
        </p>
      </Panel>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        wide
        title={selected ? tr('对阵 ') + selected.opponentName : tr('比赛')}
      >
        {selected ? <RecordDetailBody summary={selected} /> : null}
      </Modal>
    </div>
  );
}