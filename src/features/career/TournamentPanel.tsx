import { useMemo, useState } from 'react';
import { useT } from '@/hooks/useLang';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, MapPin, Play, Trophy, Zap } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { CAREER_TIERS } from '@/data/config';
import { MAPS } from '@/data/maps';
import { isEliminated, opponentOf, playerNextMatch, tournamentOutlook, tournamentRoundName } from '@/game/career';
import { Badge, Button, EmptyState, Panel, SectionTitle } from '@/components/ui';
import { TournamentBracket } from '@/features/career/TournamentBracket';

export function TournamentPanel() {
  const { tr, pick } = useT();
  const navigate = useNavigate();
  const tournaments = useGameStore((s) => s.tournaments);
  const startTournamentMatch = useGameStore((s) => s.startTournamentMatch);
  const simulateRemainder = useGameStore((s) => s.simulateTournamentRemainder);
  const [error, setError] = useState<string | null>(null);

  const active = tournaments.find((t) => t.status === 'active') ?? null;
  const outlook = active ? tournamentOutlook(active) : null;
  const lastCompleted = useMemo(
    () => [...tournaments].filter((t) => t.status === 'completed').sort((a, b) => b.createdAt - a.createdAt)[0] ?? null,
    [tournaments],
  );

  if (!active) {
    return (
      <div className='space-y-5'>
        <SectionTitle title={tr('赛程')} subtitle={tr('单败淘汰赛，比分由同一套引擎逐回合模拟。')} />
        <Panel>
          <EmptyState
            title={tr('暂无进行中的赛事')}
            hint={tr('在生涯页面进入一个联赛，即可生成新的赛程。')}
            action={<Button onClick={() => navigate('/career')}>{tr('返回联赛阶梯')}</Button>}
          />
        </Panel>
        {lastCompleted ? (
          <Panel>
            <SectionTitle title={tr('最近一场完赛赛事')} subtitle={lastCompleted.name} />
            <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]'>
              <Badge tone='success'>{tr('已结束')}</Badge>
              <span className='text-txt-muted'>{tr(CAREER_TIERS[lastCompleted.tier]?.name ?? '联赛')}</span>
              <span className='inline-flex items-center gap-1 font-semibold text-accent'>
                <Trophy size={13} />
                {lastCompleted.championId === 'player'
                  ? tr('你夺冠了')
                  : lastCompleted.teams.find((t) => t.id === lastCompleted.championId)?.name ?? tr('暂无冠军')}
              </span>
              <span className='ml-auto text-[13px] text-txt-muted'>{tr('奖金 ')}{lastCompleted.prizePool.toLocaleString()}{tr(' 金币')}</span>
            </div>
          </Panel>
        ) : null}
      </div>
    );
  }

  const nextMatch = playerNextMatch(active);
  const opponent = nextMatch ? opponentOf(active, nextMatch) : null;
  const eliminated = isEliminated(active);
  const champion = active.teams.find((t) => t.id === active.championId) ?? null;
  const tierName = tr(CAREER_TIERS[active.tier]?.name ?? '联赛');

  const handlePlay = () => {
    setError(null);
    const result = startTournamentMatch();
    if (!result.ok) {
      setError(tr(result.error ?? '无法开始这场比赛。'));
      return;
    }
    navigate('/match');
  };

  return (
    <div className='space-y-5'>
      <SectionTitle
        title={tr('赛事')}
        subtitle={active.name + ' · ' + tierName + tr(' · 奖金 ') + active.prizePool.toLocaleString() + tr(' 金币')}
        right={
          <div className='flex items-center gap-2'>
            <Badge tone='accent'>{tr('进行中')}</Badge>
            <Badge tone='neutral'>{active.teams.length}{tr(' 支队伍')}</Badge>
            <Badge tone='accent'>{active.format === 'double' ? tr('双败淘汰') : active.format === 'swiss' ? tr('瑞士轮 · 三败出局') : tr('单败淘汰')}</Badge>
          </div>
        }
      />

      <div className='grid gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]'>
        <Panel>
          <SectionTitle title={tr('赛程')} subtitle={tr('胜者全取。比分由与你自己的比赛完全相同的回合引擎模拟得出。')} />
          {outlook ? (
            <div className='mb-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-txt-muted'>
              <span className='font-semibold text-txt'>{pick(outlook.text, outlook.textEn)}</span>
              {active.format !== 'single' ? (
                <span className='ml-2'>{tr('胜')} {outlook.wins} · {tr('负')} {outlook.losses}{tr(' · 剩余生命 ')}{outlook.lives}</span>
              ) : null}
              {active.placement ? <span className='ml-2 text-accent'>{tr('最终名次：')}{tr(active.placement)}</span> : null}
            </div>
          ) : null}
          {active.format === 'single' ? (
            <TournamentBracket tournament={active} />
          ) : (
            <div className='space-y-1.5'>
              {active.matches.map((m) => {
                const foe = active.teams.find((x) => x.id === (m.aId === 'player' ? m.bId : m.aId));
                const won = m.winnerId === 'player';
                const played = m.winnerId !== null;
                return (
                  <div key={m.id} className='flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[13px]'>
                    <span className='w-10 shrink-0 text-txt-muted'>{pick('第 ' + (m.slot + 1) + ' 场', 'Match ' + (m.slot + 1))}</span>
                    <span className='min-w-0 flex-1 truncate text-txt'>{foe ? foe.name : tr('待定')}</span>
                    {played ? (
                      <Badge tone={won ? 'success' : 'danger'}>{won ? tr('胜') : tr('负')} {m.scoreA}:{m.scoreB}</Badge>
                    ) : (
                      <Badge tone='muted'>{tr('待打')}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <div className='space-y-4'>
          <Panel>
            <SectionTitle
              title={tr('你的对局')}
              subtitle={eliminated ? tr('赛程结束') : nextMatch ? tr(tournamentRoundName(nextMatch.round, active.size)) : tr('等待赛程推进')}
            />
            {eliminated ? (
              <div className='space-y-3'>
                <div className='flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-[15px] text-danger'>
                  <AlertTriangle size={16} className='mt-0.5 shrink-0' />
                  <span>{tr('你已在 ')}{active.name}{tr(' 中被淘汰。模拟剩余比赛以决出冠军。')}</span>
                </div>
                <Button className='w-full' variant='outline' onClick={() => simulateRemainder(active.id)}>
                  <Zap size={14} /> {tr('模拟剩余比赛')}
                </Button>
              </div>
            ) : nextMatch && opponent ? (
              <div className='space-y-3'>
                <div className='rounded-xl border border-white/10 bg-ink-700/50 p-3'>
                  <div className='label-xs'>{tr('对手')}</div>
                  <div className='mt-0.5 font-display text-base font-semibold text-txt'>{opponent.name}</div>
                  <div className='mt-1 flex flex-wrap items-center gap-2 text-[13px] text-txt-muted'>
                    <span className='inline-flex items-center gap-1'>
                      <MapPin size={11} /> {MAPS[nextMatch.mapId]?.name ?? nextMatch.mapId}
                    </span>
                    <span>{tr('评分 ')}{opponent.rating}</span>
                  </div>
                </div>
                <Button className='w-full' onClick={handlePlay}>
                  <Play size={14} /> {tr('开始比赛')}
                </Button>
                {error ? (
                  <p className='rounded-lg border border-danger/30 bg-danger/10 px-2 py-1.5 text-[13px] text-danger'>{error}</p>
                ) : null}
                <Button className='w-full' variant='outline' size='sm' onClick={() => simulateRemainder(active.id)}>
                  <Zap size={13} /> {tr('模拟剩余比赛')}
                </Button>
              </div>
            ) : (
              <div className='space-y-3'>
                <p className='text-[15px] text-txt-muted'>{tr('当前没有你的对局。')}</p>
                {champion ? (
                  <div className='rounded-xl border border-accent/25 bg-accent/[0.06] px-3 py-2 text-[15px]'>
                    <span className='label-xs'>{tr('冠军')}</span>
                    <div className='mt-0.5 font-semibold text-txt'>{champion.id === 'player' ? tr('你') : champion.name}</div>
                  </div>
                ) : null}
                <Button className='w-full' variant='outline' size='sm' onClick={() => simulateRemainder(active.id)}>
                  <Zap size={13} /> {tr('模拟剩余比赛')}
                </Button>
              </div>
            )}
          </Panel>

          <Panel>
            <SectionTitle title={tr('奖金池')} />
            <div className='stat-number text-accent'>{active.prizePool.toLocaleString()}</div>
            <p className='mt-1 text-[13px] text-txt-muted'>{tr('夺得总决赛后发放金币。每场比赛仍会结算积分变化。')}</p>
            <div className='mt-3 space-y-1 text-[13px] text-txt-muted'>
              <div className='flex items-center justify-between'>
                <span>{tr('冠军')}</span>
                <span className='font-semibold text-txt'>
                  {champion ? (champion.id === 'player' ? tr('你') : champion.name) : tr('待定')}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span>{tr('联赛')}</span>
                <span className='font-semibold text-txt'>{tierName}</span>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className='flex items-start gap-2 text-[13px] leading-relaxed text-txt-muted'>
              <Info size={14} className='mt-0.5 shrink-0 text-accent' />
              <span>
                {tr('AI 对 AI 的比赛由和你对局相同的引擎模拟——完整阵容、战术与经济，而不是按队伍评分掷骰子。 只有你自己的比赛会在训练赛页面逐回合进行。')}
              </span>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}