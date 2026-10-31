import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { Badge, Button, EmptyState, Panel, SectionTitle } from '@/components/ui';
import { Setup } from '@/features/matches/Setup';
import { LiveBoard } from '@/features/matches/LiveBoard';
import { PostMatch } from '@/features/matches/PostMatch';

export function MatchCenterPage() {
  const ready = useGameStore((s) => s.ready);
  const hasGame = useGameStore((s) => s.hasGame);
  const activeMatch = useGameStore((s) => s.activeMatch);
  const lastSummary = useGameStore((s) => s.lastSummary);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // 只有自由对局的结算才留在训练赛页面；生涯/赛事的比赛结果回生涯与战绩查看
  const fromCareer = lastSummary !== null && (lastSummary.mode === 'career' || lastSummary.mode === 'tournament');
  const showSummary = !activeMatch && lastSummary !== null && lastSummary.id !== dismissedId && !fromCareer;

  return (
    <div className='space-y-5'>
      <SectionTitle
        title='训练赛'
        subtitle={activeMatch
        ? '实时战术指挥 —— 每个数字都来自引擎。'
        : '自由对局（友谊赛）：侦查对手、选图、开打。联赛与赛事对局请到「生涯」开始。'}
        right={
          activeMatch
            ? <Badge tone='accent'>进行中 · 第 {activeMatch.roundNumber} 回合</Badge>
            : <Badge tone='muted'>BO1 · 单图</Badge>
        }
      />

      {!ready ? (
        <Panel>
          <p className='text-sm text-txt-muted'>正在载入你的战队…</p>
        </Panel>
      ) : !hasGame ? (
        <Panel>
          <EmptyState
            title='还没有战队'
            hint='训练赛需要一个已创建的战队。先到主页创建战队，然后就能开赛。'
            action={
              <Link to='/'>
                <Button variant='primary' size='sm'>
                  <Swords size={14} /> 前往主页
                </Button>
              </Link>
            }
          />
        </Panel>
      ) : activeMatch ? (
        <LiveBoard match={activeMatch} />
      ) : showSummary && lastSummary ? (
        <PostMatch summary={lastSummary} onExit={() => setDismissedId(lastSummary.id)} />
      ) : (
        <div className='space-y-3'>
          {fromCareer ? (
            <div className='rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-txt-muted'>
              上一场是生涯/赛事的对局——结果请到「生涯」或「战绩」查看；这里只安排训练赛（友谊赛）。
            </div>
          ) : null}
          <Setup />
        </div>
      )}
    </div>
  );
}