import clsx from 'clsx';
import { Megaphone, Pause, Timer } from 'lucide-react';
import { useT } from '@/hooks/useLang';
import { Button } from '@/components/ui';
import {
  CLUTCH_META, MATCH_TACTICS_LIMITS, useGameStore, type ClutchDecision,
} from '@/stores/gameStore';

/**
 * 场间调整面板：请求暂停（每场 2 次）/ 教练鼓舞（每场 1 次）/ 残局三选一。
 * 只在对局中的回合之间出现 —— 引擎的回合是原子推进，面板本身只在回合结束后渲染。
 * 挂载：见交付报告（RoundOrders.tsx 的 RoundOrdersPanel 里一行 JSX）。
 */
export function MatchTacticsPanel({ className }: { className?: string }) {
  const { tr } = useT();
  const match = useGameStore((s) => s.activeMatch);
  const tactics = useGameStore((s) => s.matchTactics);
  const requestPause = useGameStore((s) => s.requestPause);
  const coachBoost = useGameStore((s) => s.coachBoost);
  const setClutchDecision = useGameStore((s) => s.setClutchDecision);
  if (!match) return null;

  return (
    <div
      data-testid='match-tactics'
      className={clsx(
        'mt-3 grid gap-2 border-t border-white/5 pt-2.5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-6',
        className,
      )}
    >
      <div className='flex flex-wrap items-center gap-1.5'>
        <span className='inline-flex items-center gap-1 text-[12px] text-txt-muted'>
          <Timer size={11} /> {tr('场间调整')}
        </span>
        <Button
          size='sm'
          variant='outline'
          disabled={tactics.pausesUsed >= MATCH_TACTICS_LIMITS.pauses}
          onClick={() => requestPause()}
        >
          <Pause size={13} />
          {tr('请求暂停')}
          <span className='font-mono tabular-nums'>{tactics.pausesUsed}/{MATCH_TACTICS_LIMITS.pauses}</span>
        </Button>
        <Button
          size='sm'
          variant='outline'
          disabled={tactics.coachBoostsUsed >= MATCH_TACTICS_LIMITS.coachBoosts}
          onClick={() => coachBoost()}
        >
          <Megaphone size={13} />
          {tr('教练鼓舞')}
          <span className={clsx('font-semibold', tactics.coachBoostArmed ? 'text-accent' : 'text-txt-muted')}>
            {tactics.coachBoostArmed ? tr('待生效') : tactics.coachBoostsUsed > 0 ? tr('已用') : tr('就绪')}
          </span>
        </Button>
      </div>

      <div className='min-w-0'>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='label-xs'>{tr('残局决策')}</span>
          {(Object.keys(CLUTCH_META) as ClutchDecision[]).map((decision) => (
            <button
              key={decision}
              type='button'
              aria-pressed={tactics.clutch === decision}
              onClick={() => setClutchDecision(tactics.clutch === decision ? null : decision)}
              className={clsx(
                'focus-ring rounded-md border px-2 py-0.5 text-[12px] font-semibold transition-colors',
                tactics.clutch === decision
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-white/10 text-txt-muted hover:border-white/25 hover:text-txt',
              )}
            >
              {tr(CLUTCH_META[decision].label)}
            </button>
          ))}
        </div>
        <p className='mt-1 text-[12px] leading-snug text-txt-muted'>
          {tactics.clutchNote ? tr(tactics.clutchNote) : tr('还没做残局决策 —— 选定后只影响下一回合。')}
        </p>
      </div>
    </div>
  );
}
