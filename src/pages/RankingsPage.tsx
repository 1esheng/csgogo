import { useNavigate } from 'react-router-dom';
import { useT } from '@/hooks/useLang';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Info, Medal, Radio, TrendingDown, TrendingUp } from 'lucide-react';
import { useGameStore, aiOpponents } from '@/stores/gameStore';
import { CAREER_TIERS, RATING_CONFIG } from '@/data/config';
import { eloDelta } from '@/game/career';
import { Badge, Button, Panel, Progress, SectionTitle, StatTile, Tabs } from '@/components/ui';

const TABS = [
  { id: 'all', label: '全部' },
  { id: 'top8', label: '前 8' },
  { id: 'league', label: '你的联赛' },
];

export function RankingsPage() {
  const { tr, pick } = useT();
  const { t } = useT();
  const liveWorld = useGameStore((s) => s.liveWorld);
  const setLiveWorld = useGameStore((s) => s.setLiveWorld);
  const navigate = useNavigate();
  const leaders = useGameStore((s) => s.leaders);
  const career = useGameStore((s) => s.career);
  const club = useGameStore((s) => s.club);
  const [tab, setTab] = useState('all');

  const sorted = useMemo(() => [...leaders].sort((a, b) => b.rating - a.rating), [leaders]);
  const rating = sorted.find((l) => l.id === 'player')?.rating ?? RATING_CONFIG.start;
  const playerRank = sorted.findIndex((l) => l.id === 'player') + 1;

  const tierOf = (id: string, tier: number) => (id === 'player' ? career.tier : tier);

  const rows = useMemo(() => {
    if (tab === 'top8') return sorted.slice(0, 8);
    if (tab === 'league') return sorted.filter((entry) => tierOf(entry.id, entry.tier) === career.tier);
    return sorted;
  }, [sorted, tab, career.tier]);

  const upcoming = useMemo(() => {
    return [...aiOpponents()]
      .sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating))
      .slice(0, 3)
      .map((spec) => ({
        spec,
        gain: eloDelta(rating, spec.rating, true),
        loss: eloDelta(rating, spec.rating, false),
      }));
  }, [rating]);

  const signed = (value: number) => (value > 0 ? '+' + value : String(value));

  const secondsAgo = liveWorld.lastTickAt ? Math.max(0, Math.round((Date.now() - liveWorld.lastTickAt) / 1000)) : null;
  return (
    <div className='space-y-5'>
      <SectionTitle
        title={t('page.rankings.title')}
        subtitle={tr('本存档的实时排名——榜单上的每个评分都来自真实模拟的比赛。')}
        right={<Badge tone='accent'>{tr(CAREER_TIERS[career.tier]?.name ?? '联赛')}</Badge>}
      />

      <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
        <StatTile label={tr('你的积分')} value={rating} hint='Elo，K=28' tone='accent' icon={<Medal size={16} />} />
        <StatTile label={tr('巡回赛排名')} value={playerRank > 0 ? '#' + playerRank : '—'} hint={tr('共 ') + sorted.length + tr(' 支俱乐部')} />
        <StatTile label={tr('你的战绩')} value={club.wins + '-' + club.losses} hint={tr('近况 ') + (club.streak > 0 ? '+' : '') + club.streak} />
        <StatTile label={tr('榜首积分')} value={sorted[0]?.rating ?? '—'} hint={sorted[0]?.name ?? tr('暂无俱乐部')} />
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]'>
        <Panel>
          <SectionTitle title={tr('积分榜')} right={<Tabs tabs={TABS.map((item) => ({ ...item, label: tr(item.label) }))} active={tab} onChange={setTab} />} />
          {rows.length === 0 ? (
            <p className='rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-txt-muted'>
              {tr('本联赛暂无已评分的俱乐部——打一场比赛即可让积分上榜。')}
            </p>
          ) : (
            <div className='space-y-1.5'>
              <div className='hidden grid-cols-[44px_minmax(0,1fr)_80px_88px_120px_160px] gap-2 px-3 text-[10px] text-txt-muted sm:grid'>
                <span>#</span>
                <span>{tr('俱乐部')}</span>
                <span className='text-right'>{tr('积分')}</span>
                <span className='text-right'>{tr('胜-负')}</span>
                <span>{tr('联赛')}</span>
                <span>{tr('胜率')}</span>
              </div>
              {rows.map((entry) => {
                const isPlayer = entry.id === 'player';
                const played = entry.wins + entry.losses;
                const winPct = played > 0 ? (entry.wins / played) * 100 : 0;
                const league = tr(CAREER_TIERS[tierOf(entry.id, entry.tier)]?.name ?? '未定级');
                const rank = sorted.indexOf(entry) + 1;
                return (
                  <button
                    type='button'
                    onClick={() => navigate('/team/' + entry.id)}
                    key={entry.id}
                    className={clsx(
                      'grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors sm:grid-cols-[44px_minmax(0,1fr)_80px_88px_120px_160px]',
                      isPlayer
                        ? 'border-accent/40 bg-accent/[0.07]'
                        : 'border-white/5 bg-ink-700/40 hover:border-white/15',
                    )}
                  >
                    <span
                      className={clsx(
                        'font-display text-sm font-semibold',
                        rank <= 3 ? 'text-accent' : isPlayer ? 'text-accent' : 'text-txt-muted',
                      )}
                    >
                      {rank}
                    </span>
                    <div className='min-w-0'>
                      <div className='flex min-w-0 items-center gap-2'>
                        <span className='truncate text-sm font-semibold text-txt'>{entry.name}</span>
                        {isPlayer ? <Badge tone='accent'>{tr('我')}</Badge> : null}
                      </div>
                      <div className='text-[11px] text-txt-muted sm:hidden'>
                        {entry.wins}-{entry.losses} · {league}
                      </div>
                    </div>
                    <span className='text-right font-display text-sm font-semibold text-txt'>{entry.rating}</span>
                    <span className='hidden text-right text-sm text-txt-muted sm:block'>
                      {entry.wins}-{entry.losses}
                    </span>
                    <span className='hidden truncate text-xs text-txt-muted sm:block'>{league}</span>
                    <div className='hidden sm:block'>
                      <Progress value={winPct} max={100} tone={winPct >= 50 ? 'success' : 'danger'} height='h-1.5' />
                      <div className='mt-0.5 text-right text-[10px] text-txt-muted'>{Math.round(winPct)}%</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className='mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-txt-muted'>
            <Info size={13} className='mt-0.5 shrink-0' />
            <span>
              {tr('积分榜由真实模拟结果推导：每支俱乐部的评分都按引擎赛后的同一套 Elo 公式变动，AI 俱乐部也会依据其实际参加的赛事重新评分。')}
            </span>
          </div>
        </Panel>

        <div className='space-y-4'>
          <Panel>
            <SectionTitle title={tr('下一场积分变化')} subtitle={tr('当前评分最接近的对手')} />
            <div className='space-y-2'>
              {upcoming.map(({ spec, gain, loss }) => (
                <div key={spec.id} className='rounded-xl border border-white/5 bg-ink-700/40 px-3 py-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='min-w-0 truncate text-sm font-semibold text-txt'>{spec.name}</span>
                    <span className='shrink-0 text-xs text-txt-muted'>{spec.rating}</span>
                  </div>
                  <div className='mt-1 flex items-center gap-3 text-xs'>
                    <span className='inline-flex items-center gap-1 font-semibold text-emerald-300'>
                      <TrendingUp size={12} /> {tr('胜')} {signed(gain)}
                    </span>
                    <span className='inline-flex items-center gap-1 font-semibold text-danger'>
                      <TrendingDown size={12} /> {tr('负')} {signed(loss)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className='mt-3 text-[11px] leading-relaxed text-txt-muted'>
              {tr('采用 K=28 的 Elo 算法，单场最低加分 ')}{RATING_CONFIG.winFloor}{tr('。击败高评分俱乐部收益更高，输给弱旅损失更大。')}
            </p>
          </Panel>
        </div>
      </div>
      <Panel>
        <SectionTitle
          title={tr('实时电竞世界')}
          subtitle={liveWorld.enabled ? tr('每 60 秒自动推进一轮国际赛事并刷新排行榜') : tr('已暂停实时更新')}
          right={<Button size='sm' variant={liveWorld.enabled ? 'outline' : 'primary'} onClick={() => setLiveWorld(!liveWorld.enabled)}>{liveWorld.enabled ? tr('暂停') : tr('继续')}</Button>}
        />
        <div className='flex flex-wrap items-center gap-3 text-[11px] text-txt-muted'>
          <span className='inline-flex items-center gap-1'>
            <Radio size={12} className={liveWorld.enabled ? 'text-emerald-300' : 'text-txt-muted'} />
            {liveWorld.enabled ? tr('运行中') : tr('已暂停')}
          </span>
          <span>{tr('已推进 ')}{liveWorld.ticks}{tr(' 轮')}</span>
          {secondsAgo !== null ? <span>{secondsAgo}{tr(' 秒前同步')}</span> : <span>{tr('等待首次同步…')}</span>}
        </div>
        {liveWorld.feed.length > 0 ? (
          <div className='mt-3 space-y-1.5'>
            {liveWorld.feed.slice(0, 5).map((f) => (
              <div key={f.id} className='animate-fade-up rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs text-txt-muted'>{pick(f.text, f.textEn ?? f.text)}</div>
            ))}
          </div>
        ) : (
          <p className='mt-3 text-xs text-txt-muted'>{tr('还没有动态——等待第一轮世界赛结果。')}</p>
        )}
      </Panel>
    </div>
  );
}
