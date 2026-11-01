import { useEffect, useState } from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { FastForward, Flag, Gauge, Info, LogOut, Play, X } from 'lucide-react';
import type { BuyType, MatchState } from '@/types';
import { activeTacticOptions, tacticInfo, useGameStore } from '@/stores/gameStore';
import { BUY_LABEL, MATCH_ECONOMY } from '@/data/config';
import { MAPS } from '@/data/maps';
import { Badge, Button, Modal, Progress } from '@/components/ui';
import { moneyLabel, ROUND_REASON_LABEL } from './matchUi';

const SPEEDS: { value: 1 | 2 | 4; label: string }[] = [
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
];

export function RoundOrdersPanel({ match }: { match: MatchState }) {
  const { tr } = useT();
  const store = useGameStore();
  const orders = store.playerOrders;
  const buys: { id: BuyType; label: string; hint: string }[] = [
    { id: 'eco', label: tr(BUY_LABEL.eco), hint: tr('存钱为主，只买手枪') },
    { id: 'light', label: tr(BUY_LABEL.light), hint: tr('冲锋枪 / 护甲，起买 ') + moneyLabel(MATCH_ECONOMY.buyThresholds.light) },
    { id: 'force', label: tr(BUY_LABEL.force), hint: tr('强起购买，起买 ') + moneyLabel(MATCH_ECONOMY.buyThresholds.force) },
    { id: 'full', label: tr(BUY_LABEL.full), hint: tr('步枪 + 道具，起买 ') + moneyLabel(MATCH_ECONOMY.buyThresholds.full) },
    { id: 'awp', label: tr(BUY_LABEL.awp), hint: tr('AWP 购买，起买 ') + moneyLabel(MATCH_ECONOMY.buyThresholds.awp) },
  ];
  const playerSide = match.teams.A.side;
  const options = activeTacticOptions(playerSide);
  const tacticId = orders && options.some((o) => o.id === orders.tactic) ? orders.tactic : (options[0]?.id ?? '');
  const tactic = tacticId ? tacticInfo(tacticId) : null;
  const [confirmQuit, setConfirmQuit] = useState(false);
  const bank = match.teams.A.players.reduce((sum, p) => sum + p.money, 0);
  const site = MAPS[match.mapId];

  // Keep the stored orders valid after a half-time side swap or a tactic change.
  useEffect(() => {
    const current = useGameStore.getState().playerOrders;
    if (!current) return;
    const valid = options.some((o) => o.id === current.tactic);
    if (valid && current.side === playerSide) return;
    useGameStore.getState().setPlayerOrders({
      side: playerSide,
      tactic: valid ? current.tactic : (options[0]?.id ?? 'default'),
    });
  }, [orders?.side, orders?.tactic, options, playerSide]);

  return (
    <div className='surface p-3'>
      <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
        <div>
          <div className='mb-1.5 flex items-center justify-between'>
            <span className='label-xs'>{tr('购买')}</span>
            <span className='text-[11px] text-txt-muted'>{tr('资金 ')}{moneyLabel(bank)}</span>
          </div>
          <div className='grid grid-cols-5 gap-1'>
            {buys.map((buy) => (
              <button
                key={buy.id}
                title={buy.hint}
                onClick={() => store.setPlayerOrders({ buy: buy.id })}
                className={clsx(
                  'focus-ring rounded-lg border px-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                  orders?.buy === buy.id
                    ? 'border-accent/60 bg-accent/15 text-accent'
                    : 'border-white/10 text-txt-muted hover:border-white/25 hover:text-txt',
                )}
              >
                {buy.label}
              </button>
            ))}
          </div>
          <div className='mt-1.5 text-[10px] leading-snug text-txt-muted'>
            {buys.find((b) => b.id === orders?.buy)?.hint ?? tr('为本回合设定购买方案。')}
          </div>
        </div>

        <div>
          <div className='mb-1.5 flex items-center justify-between'>
            <span className='label-xs'>{playerSide === 'T' ? tr('T 方执行') : tr('CT 方布阵')}</span>
            <Badge tone={playerSide === 'T' ? 'accent' : 'neutral'}>{playerSide}</Badge>
          </div>
          <select
            value={tacticId}
            onChange={(e) => store.setPlayerOrders({ tactic: e.target.value })}
            className='focus-ring w-full rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-sm text-txt'
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>{tr(o.name)}</option>
            ))}
          </select>
          {tactic ? (
            <p className='mt-1.5 text-[11px] leading-snug text-txt-muted'>{tr(tactic.blurb)}</p>
          ) : (
            <p className='mt-1.5 text-[11px] text-txt-muted'>{tr('该阵营暂无可用战术。')}</p>
          )}
          {tactic ? (
            <div className='mt-1.5 grid grid-cols-3 gap-2'>
              <MiniBar label={tr('道具')} value={tactic.utility} />
              <MiniBar label={tr('信息')} value={tactic.info} />
              <MiniBar label={tr('补枪')} value={tactic.trade} />
            </div>
          ) : null}
        </div>

        <div className='flex min-w-[190px] flex-col gap-1.5'>
          <span className='label-xs'>{tr('操作')}</span>
          <Button size='md' onClick={() => store.playNextRound()}>
            <Play size={15} /> {tr('推进回合 ')}{match.roundNumber}
          </Button>
          <Button size='sm' variant='outline' onClick={() => store.autoPlay()}>
            <FastForward size={14} /> {tr('自动模拟剩余')}
          </Button>
          <div className='flex items-center justify-between gap-1 rounded-lg border border-white/10 px-1.5 py-1'>
            <span className='inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-txt-muted'>
              <Gauge size={11} /> {tr('速度')}
            </span>
            <div className='flex gap-0.5'>
              {SPEEDS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => store.updateSettings({ matchSpeed: s.value })}
                  className={clsx(
                    'focus-ring rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                    store.settings.matchSpeed === s.value ? 'bg-accent text-ink-900' : 'text-txt-muted hover:text-txt',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Button size='sm' variant='ghost' onClick={() => setConfirmQuit(true)}>
            <LogOut size={14} /> {tr('弃赛')}
          </Button>
        </div>
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-2.5'>
        <span className='inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-txt-muted'>
          <Flag size={11} /> {tr('目标')}
        </span>
        {playerSide === 'T' ? (
          <>
            {(['AUTO', 'A', 'B'] as const).map((t) => (
              <button
                key={t}
                onClick={() => store.setPlayerOrders({ target: t })}
                title={t === 'AUTO' ? tr('交给指挥决定') : tr(site.sites[t].name) + tr(' —— ') + tr(site.sites[t].note)}
                className={clsx(
                  'focus-ring rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                  (orders?.target ?? 'AUTO') === t
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-white/10 text-txt-muted hover:text-txt',
                )}
              >
                {t === 'AUTO' ? tr('自动') : t + tr(' 点')}
              </button>
            ))}
          </>
        ) : (
          <span className='text-[11px] text-txt-muted'>
            {tr('防守方 —— 打哪张点由 T 方决定，你的布阵决定堆哪个点。')}
          </span>
        )}
      </div>

      <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)} title={tr('放弃本场比赛？')}>
        <p className='text-sm text-txt-muted'>
          {tr('本场比赛将作废：不计入战绩，不发金币与经验，回合记录也会丢失。 当前比分 ')}{match.teams.A.score} : {match.teams.B.score}{tr('，第 ')}{match.roundNumber}{tr(' 回合')}
          {match.rounds.length > 0
            ? tr(' —— 上一回合以')
              + tr(ROUND_REASON_LABEL[match.rounds[match.rounds.length - 1].reason])
              + tr('结束。')
            : tr('。')}
        </p>
        <div className='mt-4 flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => setConfirmQuit(false)}>
            <X size={14} /> {tr('继续比赛')}
          </Button>
          <Button
            variant='danger'
            onClick={() => {
              setConfirmQuit(false);
              store.quitMatch();
            }}
          >
            <LogOut size={14} /> {tr('确认弃赛')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className='mb-0.5 flex items-center justify-between text-[9px] uppercase tracking-wider text-txt-muted'>
        <span>{label}</span>
        <span className='font-mono'>{Math.round(value * 100)}</span>
      </div>
      <Progress value={value * 100} max={100} tone='accent' height='h-1' />
    </div>
  );
}

export function MatchOverPanel({ match }: { match: MatchState }) {
  const { tr } = useT();
  const store = useGameStore();
  const closeEvent = [...match.events].reverse().find((e) => e.kind === 'match-end');
  return (
    <div className='surface flex flex-wrap items-center justify-between gap-3 p-3'>
      <div className='flex items-start gap-3'>
        <Info size={16} className='mt-0.5 shrink-0 text-accent' />
        <div>
          <div className='font-display text-sm font-bold text-txt'>{tr('比赛结束')}</div>
          <p className='mt-0.5 text-[11px] text-txt-muted'>
            {closeEvent ? closeEvent.text : tr('最后一回合已经打完。')}
          </p>
        </div>
      </div>
      <Button variant='primary' onClick={() => store.finalizeFromStore()}>{tr('结算并领取奖励')}</Button>
    </div>
  );
}
