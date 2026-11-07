import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loadReplay } from '@/db/db';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { EmptyState, Panel, SectionTitle } from '@/components/ui';
import { MatchStats, sidesForReplay, type ReplayData } from '@/features/matches/MatchStats';
import { RoundReplay } from '@/features/matches/RoundReplay';

function BackLink({ label }: { label: string }) {
  return (
    <Link to='/records' className='focus-ring t-colors inline-flex items-center gap-1.5 rounded-lg text-[13px] font-semibold text-txt-muted hover:text-txt'>
      <ArrowLeft size={14} /> {label}
    </Link>
  );
}

/**
 * 赛后数据站 + 对局回放。数据只有两个来源：
 * 1) 存档里的 MatchSummary（计分板 + 引擎标记的关键回合）；
 * 2) IndexedDB 里的 ReplayRow（逐回合 RoundRecord，最近 20 场）。
 * 没有第三个来源 —— 缺失指标不编造，直接在页脚列明。
 */
export function MatchReportPage({ matchId }: { matchId?: string }) {
  const { tr } = useT();
  const params = useParams<{ id: string }>();
  const id = matchId ?? params.id ?? '';
  const matches = useGameStore((state) => state.matches);
  const summary = useMemo(() => matches.find((row) => row.id === id) ?? null, [matches, id]);
  const [replay, setReplay] = useState<ReplayData | null>(null);
  const [loadingReplay, setLoadingReplay] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoadingReplay(true);
    setReplay(null);
    if (!id) {
      setLoadingReplay(false);
      return () => { alive = false; };
    }
    loadReplay(id)
      .then((row) => {
        if (!alive) return;
        setReplay(row
          ? { id: row.id, at: row.at, mapId: row.mapId, result: row.result, events: row.events, rounds: row.rounds }
          : null);
        setLoadingReplay(false);
      })
      .catch(() => {
        if (alive) setLoadingReplay(false);
      });
    return () => { alive = false; };
  }, [id]);

  const sides = useMemo(() => sidesForReplay(summary, replay), [summary, replay]);

  if (!summary) {
    return (
      <div className='space-y-4'>
        <BackLink label={tr('返回战绩')} />
        <Panel>
          <EmptyState
            title={tr('找不到这场比赛的摘要。战绩只保留最近 100 场，更早的比赛没有数据可看。')}
            hint={tr('在战绩页选择一场比赛，点「查看数据」就能回到这里。')}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      <BackLink label={tr('返回战绩')} />
      <SectionTitle
        title={tr('赛后数据站')}
        subtitle={tr('本场所有数字都来自引擎模拟：计分板、逐回合比分、经济与关键回合。')}
      />
      <MatchStats summary={summary} replay={replay} />
      <Panel className='space-y-3'>
        <SectionTitle
          title={tr('对局回放')}
          subtitle={tr('按回合回看：每个回合的击杀序列、回合结果与双方资金，纯只读。')}
          right={loadingReplay ? <span className='text-[12px] text-txt-muted'>{tr('回放载入中…')}</span> : null}
        />
        <RoundReplay replay={replay} sides={sides} />
      </Panel>
    </div>
  );
}
