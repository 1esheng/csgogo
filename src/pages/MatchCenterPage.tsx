import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { isMatchOver } from '@/engine/match';
import { useT } from '@/hooks/useLang';
import { Badge, Button, EmptyState, Panel, SectionTitle } from '@/components/ui';
import { Setup } from '@/features/matches/Setup';
import { LiveBoard } from '@/features/matches/LiveBoard';
import { PostMatch } from '@/features/matches/PostMatch';

/** 输入框 / 文本域 / 下拉框里不接管按键 —— 空格与数字键要留给正在输入的人。 */
function isTypingTarget(el: HTMLElement | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/** 任何浮层（弃赛确认等）打开时，键盘交互应交给浮层自己。 */
function openOverlay(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-modal-overlay], [role="dialog"][aria-modal="true"]');
}

/** 焦点已经在某个可按下控件上时，空格应该激活它本身，而不是越权去推进回合。 */
function focusedControl(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  return active?.closest<HTMLElement>('button, a[href], [role="button"], [role="tab"], summary') ?? null;
}

export function MatchCenterPage() {
  const { tr } = useT();
  const ready = useGameStore((s) => s.ready);
  const hasGame = useGameStore((s) => s.hasGame);
  const activeMatch = useGameStore((s) => s.activeMatch);
  const lastSummary = useGameStore((s) => s.lastSummary);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // 只有自由对局的结算才留在训练赛页面；生涯/赛事的比赛结果回生涯与战绩查看
  const fromCareer = lastSummary !== null && (lastSummary.mode === 'career' || lastSummary.mode === 'tournament');
  const showSummary = !activeMatch && lastSummary !== null && lastSummary.id !== dismissedId && !fromCareer;


  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (isTypingTarget(target) || isTypingTarget(document.activeElement as HTMLElement | null)) return;

      const overlay = openOverlay();
      if (e.key === 'Escape') {
        if (!overlay) return;
        // 浮层的关闭回调挂在遮罩层上：点遮罩等同于关闭。
        const backdrop = overlay.closest<HTMLElement>('[data-modal-overlay]') ?? overlay.parentElement;
        if (backdrop) { e.preventDefault(); backdrop.click(); }
        return;
      }
      // 浮层打开时：不推进回合，也不抢数字键。
      if (overlay) return;

      if (e.code === 'Space') {
        const control = focusedControl();
        if (control && !control.hasAttribute('data-advance')) return;
        const btn = document.querySelector<HTMLButtonElement>('[data-advance]');
        if (btn && !btn.disabled) { e.preventDefault(); btn.click(); return; }
        // 兜底：Button 没有把 data-advance 透传到 DOM 时，直接走同一条引擎入口。
        // 只在「比赛确实在等下一回合」时接管空格，准备页的空格仍然是翻页。
        const store = useGameStore.getState();
        if (store.activeMatch && store.activeMatchInfo && store.playerOrders && !isMatchOver(store.activeMatch)) {
          e.preventDefault();
          store.playNextRound();
        }
        return;
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        const selects = document.querySelectorAll<HTMLSelectElement>("select");
        const el = selects[Number(e.key) - 1];
        if (el) { e.preventDefault(); el.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className='space-y-4'>
      <SectionTitle
        title={tr('训练赛')}
        subtitle={activeMatch
        ? tr('实时战术指挥 —— 每个数字都来自引擎。')
        : tr('自由对局（友谊赛）：侦查对手、选图、开打。联赛与赛事对局请到「生涯」开始。')}
        right={
          activeMatch
            ? <Badge tone='accent'>{tr('进行中 · 第 ')}{activeMatch.roundNumber}{tr(' 回合')}</Badge>
            : <Badge tone='muted'>{tr('BO1 · 单图')}</Badge>
        }
      />

      {!ready ? (
        <Panel>
          <p className='text-[15px] text-txt-muted'>{tr('正在载入你的战队…')}</p>
        </Panel>
      ) : !hasGame ? (
        <Panel>
          <EmptyState
            title={tr('还没有战队')}
            hint={tr('训练赛需要一个已创建的战队。先到主页创建战队，然后就能开赛。')}
            action={
              <Link to='/'>
                <Button variant='primary' size='sm'>
                  <Swords size={14} /> {tr('前往主页')}
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
            <div className='surface px-3 py-2 text-[13px] text-txt-muted'>
              {tr('上一场是生涯/赛事的对局——结果请到「生涯」或「战绩」查看；这里只安排训练赛（友谊赛）。')}
            </div>
          ) : null}
          <Setup />
        </div>
      )}
    </div>
  );
}
