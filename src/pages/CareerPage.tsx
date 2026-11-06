import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Coins, FastForward, Flame, Rocket, Swords, Trophy } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { CAREER_TIERS, RATING_CONFIG } from '@/data/config';
import { MAPS } from '@/data/maps';
import { opponentOf, playerNextMatch, tierSpec } from '@/game/career';
import { Badge, Button, EmptyState, Panel, Progress, SectionTitle, StatTile } from '@/components/ui';
import { TierLadder, type TierError } from '@/features/career/TierLadder';
import { TournamentPanel } from '@/features/career/TournamentPanel';

const STATUS_LABEL: Record<string, string> = {
  upcoming: '未开始',
  active: '进行中',
  completed: '已结束',
};

export function CareerPage() {
  const { tr, pick } = useT();
  const { t } = useT();
  const navigate = useNavigate();
  const career = useGameStore((s) => s.career);
  const club = useGameStore((s) => s.club);
  const leaders = useGameStore((s) => s.leaders);
  const tournaments = useGameStore((s) => s.tournaments);
  const enterTournament = useGameStore((s) => s.enterTournament);
  const simulateCareerSeason = useGameStore((s) => s.simulateCareerSeason);
  const [fastSim, setFastSim] = useState(false);

  const [busyTier, setBusyTier] = useState<number | null>(null);
  const [error, setError] = useState<TierError | null>(null);

  const rating = leaders.find((l) => l.id === 'player')?.rating ?? RATING_CONFIG.start;
  const currentTier = tierSpec(career.tier);
  const nextTier = career.tier + 1 < CAREER_TIERS.length ? CAREER_TIERS[career.tier + 1] : null;
  const [recordLimit, setRecordLimit] = useState(5);
  const active = tournaments.find((t) => t.status === 'active') ?? null;
  const nextMatch = active ? playerNextMatch(active) : null;
  const nextOpponent = active && nextMatch ? opponentOf(active, nextMatch) : null;

  const toNext = nextTier ? Math.max(0, nextTier.ratingFloor - rating) : 0;
  const span = nextTier ? Math.max(1, nextTier.ratingFloor - currentTier.ratingFloor) : 1;
  const progress = nextTier ? rating - currentTier.ratingFloor : span;

  const history = useMemo(
    () => [...tournaments].sort((a, b) => b.createdAt - a.createdAt),
    [tournaments],
  );

  const visibleHistory = history.slice(0, recordLimit);
  const hasMoreRecords = history.length > visibleHistory.length;

  const handleEnter = (tier: number) => {
    setError(null);
    setBusyTier(tier);
    const result = enterTournament(tier);
    setBusyTier(null);
    if (!result.ok) {
      setError({ tier, text: result.error ?? pick('无法进入该联赛。', 'Cannot enter this tier.') });
      return;
    }
  };

  return (
    <div className='space-y-5'>
      <SectionTitle
        title={t('page.career.title')}
        subtitle={tr('第') + ' ' + career.season + tr(' 赛季 · ') + club.name}
        right={<div className='flex items-center gap-2'><Badge tone='accent'>{tr(currentTier.name)}</Badge><Button size='sm' variant='outline' onClick={() => navigate('/team/player')}>{tr('战队详情')}</Button></div>}
      />

      <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
        <StatTile label={tr('巡回赛积分')} value={rating} hint={tr('来自模拟对局的 Elo 分')} tone='accent' icon={<Rocket size={16} />} />
        <StatTile label={tr('冠军')} value={career.titles} hint={tr('夺冠赛事数')} icon={<Trophy size={16} />} />
        <StatTile label={tr('参赛赛事')} value={career.completedTournaments} hint={tr('已结束的赛程')} icon={<Swords size={16} />} />
        <StatTile label={tr('战绩')} value={club.wins + '-' + club.losses} hint={tr('近况 ') + (club.streak > 0 ? '+' : '') + club.streak} icon={<Flame size={16} />} />
      </div>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]'>
        <Panel>
          <SectionTitle title={tr('联赛阶梯')} subtitle={tr('离线巡回赛的十级赛事。赢下比赛提升积分，解锁下一级联赛。')} />
          <TierLadder
            rating={rating}
            currentTier={career.tier}
            busyTier={busyTier}
            error={error}
            hasActiveTournament={active !== null}
            onEnter={handleEnter}
          />
        </Panel>

        <div className='space-y-4'>
          <Panel>
            <SectionTitle title={tr('下一级联赛')} subtitle={nextTier ? tr(nextTier.name) : tr('已是最高级别')} />
            <div className='flex items-end justify-between gap-2'>
              <div className='stat-number text-accent'>{rating}</div>
              <div className='text-right text-[13px] text-txt-muted'>
                {nextTier ? (
                  <>
                    <div>{tr('还差 ')}{toNext}{tr(' 积分')}</div>
                    <div>{tr('目标 ')}{nextTier.ratingFloor}</div>
                  </>
                ) : (
                  <div>{tr('你已站在最高级别。')}</div>
                )}
              </div>
            </div>
            <div className='mt-3'>
              <Progress value={progress} max={span} tone='accent' label={nextTier ? tr(nextTier.name) + tr(' 进度') : tr('已满级')} />
            </div>
            <div className='mt-3 space-y-1 text-[13px] text-txt-muted'>
              <div className='flex items-center gap-1.5'>
                <Coins size={12} className='text-accent' /> {tr('下一级奖金池 ')}{(nextTier ?? currentTier).prize.toLocaleString()}{tr(' 金币')}
              </div>
              <div className='flex items-center gap-1.5'>
                <CalendarDays size={12} /> {tr('已完赛 ')}{career.completedTournaments}{tr(' 场 · 夺冠 ')}{career.titles}{tr(' 次')}
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title={tr('进行中的赛事')} subtitle={active ? tr('你的赛程正在进行') : tr('暂无进行中的赛程')} />
            {active ? (
              <div className='space-y-3'>
                <div className='rounded-xl border border-accent/25 bg-accent/[0.06] px-3 py-2'>
                  <div className='font-display text-[15px] font-semibold text-txt'>{active.name}</div>
                  <div className='mt-1 text-[13px] text-txt-muted'>
                    {tr(CAREER_TIERS[active.tier]?.name ?? '联赛') + tr(' · 奖金 ') + active.prizePool.toLocaleString() + tr(' 金币')}
                  </div>
                </div>
                <div className='text-[15px]'>
                  <div className='label-xs'>{tr('下一个对手')}</div>
                  {nextOpponent ? (
                    <div className='mt-1 flex flex-wrap items-center gap-2'>
                      <span className='font-semibold text-txt'>{nextOpponent.name}</span>
                      <Badge tone='neutral'>{tr('评分 ')}{nextOpponent.rating}</Badge>
                      {nextMatch ? <Badge tone='muted'>{MAPS[nextMatch.mapId]?.name ?? nextMatch.mapId}</Badge> : null}
                    </div>
                  ) : (
                    <div className='mt-1 text-[13px] text-txt-muted'>{tr('暂无你的对局——可在赛程中模拟剩余比赛。')}</div>
                  )}
                </div>
                <div className='grid gap-2 sm:grid-cols-2'>
                  <Button
                    variant='outline'
                    onClick={() => document.getElementById('career-bracket')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    {tr('查看完整赛程')}
                  </Button>
                  <Button
                    disabled={fastSim}
                    onClick={() => {
                      setFastSim(true);
                      const res = simulateCareerSeason(active.id);
                      setFastSim(false);
                      if (!res.ok && res.error) setError({ tier: active.tier, text: res.error });
                    }}
                  >
                    <FastForward size={14} /> {fastSim ? tr('模拟中…') : tr('快速模拟到结束')}
                  </Button>
                </div>
                <p className='text-[12px] leading-relaxed text-txt-muted'>
                  {tr('快速模拟会用同一套引擎替你打完本赛事的所有对局（含 AI 赛程），奖励、积分与战绩照常结算。')}
                </p>
              </div>
            ) : (
              <p className='text-[15px] text-txt-muted'>
                {tr('在联赛阶梯上选择已解锁的联赛，点击「进入」参赛。一次只能进行一项赛事。')}
              </p>
            )}
          </Panel>
        </div>
      </div>

      {active ? (
        <div id='career-bracket' className='scroll-mt-24'>
          <TournamentPanel />
        </div>
      ) : null}

      <Panel>
        <SectionTitle
          title={tr('赛事记录')}
          subtitle={history.length > 5 ? tr('最近参赛的 ') + Math.min(5, history.length) + tr(' 项（共 ') + history.length + tr(' 项）。') : tr('本存档中你参加过的全部赛事。')}
          right={
            history.length > 5 ? (
              <Button
                size='sm'
                variant='ghost'
                onClick={() => setRecordLimit((v) => (v >= history.length ? 5 : v + 5))}
              >
                {hasMoreRecords ? tr('查看更多（还有 ') + (history.length - visibleHistory.length) + tr(' 项）') : tr('收起')}
              </Button>
            ) : undefined
          }
        />
        {history.length === 0 ? (
          <EmptyState title={tr('暂无赛事记录')} hint={tr('进入业余联赛开启巡回赛之旅——它没有积分要求。')} />
        ) : (
          <div className='space-y-2'>
            {visibleHistory.map((t) => {
              const champion = t.teams?.find((team) => team.id === t.championId) ?? null;
              const wonByPlayer = t.championId === 'player';
              return (
                <div
                  key={t.id}
                  className='flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/5 bg-ink-700/40 px-3 py-2 text-[15px] transition-colors hover:border-accent/25'
                >
                  <Badge tone={t.status === 'active' ? 'accent' : t.status === 'completed' ? 'success' : 'neutral'}>{tr(STATUS_LABEL[t.status] ?? t.status)}</Badge>
                  <span className='font-semibold text-txt'>{t.name}</span>
                  <span className='text-[13px] text-txt-muted'>{tr(CAREER_TIERS[t.tier]?.name ?? '联赛')}</span>
                  <span className='ml-auto text-[13px] text-txt-muted'>
                    {champion ? (wonByPlayer ? <span className='font-semibold text-accent'>{tr('你夺冠了')}</span> : champion.name) : tr('进行中')}
                  </span>
                  <span className='inline-flex items-center gap-1 text-[13px] font-semibold text-accent'>
                    <Trophy size={12} /> {t.prizePool.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}