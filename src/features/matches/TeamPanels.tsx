import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { Skull, Star } from 'lucide-react';
import { ROLE_LABEL, type TeamState } from '@/types';
import { WEAPON_MAP } from '@/data/weapons';
import { Badge } from '@/components/ui';
import { trUiMatch } from '@/i18n/areas/ui-match';
import { hpTone, hpWidth, moneyLabel, sideTone } from './matchUi';

/**
 * One roster column: nickname, HP, weapon, money and K/D/A — all engine state.
 * 我方与对手共用同一个组件，因此字号、行高、列宽严格对称；两侧仅在左右对齐上镜像。
 */
export function TeamRoster({ team, label }: { team: TeamState; label: string }) {
  const { tr } = useT();
  const alive = team.players.filter((p) => p.alive).length;
  const bank = team.players.reduce((sum, p) => sum + p.money, 0);
  return (
    <div className='surface flex h-full min-w-0 flex-col p-3'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <div className='label-xs truncate'>{label}</div>
          <div className='truncate font-display text-[15px] font-semibold leading-tight text-txt'>{team.name}</div>
        </div>
        <Badge tone={sideTone(team.side)}>{team.side}</Badge>
      </div>

      <div className='mt-2 grid grid-cols-2 gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[12px]'>
        <div className='min-w-0'>
          <div className='text-[11px] text-txt-muted'>{tr('存活')}</div>
          <div className='font-mono font-semibold tabular-nums text-txt'>{alive}/5</div>
        </div>
        <div className='min-w-0 text-right'>
          <div className='text-[11px] text-txt-muted'>{trUiMatch('资金')}</div>
          <div className='font-mono font-semibold tabular-nums text-txt'>{moneyLabel(bank)}</div>
        </div>
      </div>

      <div className='mt-2 flex-1 space-y-1.5 overflow-y-auto'>
        {team.players.map((p) => {
          const weapon = WEAPON_MAP[p.equipment.weaponId];
          return (
            <div
              key={p.cardInstanceId}
              className={clsx(
                't-colors rounded-lg border px-2 py-1.5',
                p.alive ? 'border-white/[0.06] bg-white/[0.03]' : 'border-danger/20 bg-danger/[0.05]',
              )}
            >
              <div className='flex items-center justify-between gap-1.5'>
                <span className='flex min-w-0 items-center gap-1'>
                  {p.alive ? null : <Skull size={11} className='shrink-0 text-danger' />}
                  {p.isIGL ? (
                    <span title={tr('场上指挥')} className='shrink-0'>
                      <Star size={10} className='text-accent' />
                    </span>
                  ) : null}
                  <span
                    className={clsx(
                      'truncate text-[13px] font-semibold',
                      p.alive ? 'text-txt' : 'text-txt-muted line-through',
                    )}
                  >
                    {p.nickname}
                  </span>
                </span>
                <span className='shrink-0 font-mono text-[12px] tabular-nums text-txt-muted'>{moneyLabel(p.money)}</span>
              </div>

              <div className='mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10'>
                <div className={clsx('h-full rounded-full t-width', hpTone(p.hp))} style={{ width: hpWidth(p.hp) }} />
              </div>

              <div className='mt-1 flex items-center justify-between gap-1.5 text-[12px] text-txt-muted'>
                <span className='flex min-w-0 items-center gap-1'>
                  <span className='shrink-0 rounded bg-white/5 px-1 py-px text-[11px] text-txt-muted'>
                    {tr(ROLE_LABEL[p.role])}
                  </span>
                  <span className='truncate'>{weapon ? weapon.name : tr('空手')}</span>
                </span>
                <span className='shrink-0 font-mono tabular-nums'>
                  {p.stats.kills}/{p.stats.deaths}/{p.stats.assists}
                  {p.roundKills > 0 ? <span className='ml-1 text-accent'>+{p.roundKills}</span> : null}
                </span>
              </div>
            </div>
          );
        })}
        {team.players.length === 0 ? (
          <div className='rounded-lg border border-dashed border-white/10 px-2 py-4 text-center text-[12px] text-txt-muted'>
            {tr('暂无阵容数据。')}
          </div>
        ) : null}
      </div>

      <div className='mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[12px] text-txt-muted'>
        <span>{tr('连败奖励')}</span>
        <span className='font-mono tabular-nums'>{moneyLabel(team.lossBonus)}</span>
      </div>
    </div>
  );
}
