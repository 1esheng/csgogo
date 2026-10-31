import clsx from 'clsx';
import { Skull, Star } from 'lucide-react';
import { ROLE_LABEL, type TeamState } from '@/types';
import { WEAPON_MAP } from '@/data/weapons';
import { Badge } from '@/components/ui';
import { hpTone, hpWidth, moneyLabel, sideTone } from './matchUi';

/** One roster column: nickname, HP, weapon, money and K/D/A — all engine state. */
export function TeamRoster({
  team, label, compact,
}: { team: TeamState; label: string; compact?: boolean }) {
  const alive = team.players.filter((p) => p.alive).length;
  const bank = team.players.reduce((sum, p) => sum + p.money, 0);
  return (
    <div className='surface flex h-full flex-col p-3'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div className='min-w-0'>
          <div className='label-xs truncate'>{label}</div>
          <div className='truncate font-display text-sm font-bold text-txt'>{team.name}</div>
        </div>
        <Badge tone={sideTone(team.side)}>{team.side}</Badge>
      </div>
      <div className='mb-2 flex items-center justify-between text-[11px] text-txt-muted'>
        <span>{alive}/5 存活</span>
        <span className='font-mono'>{moneyLabel(bank)}</span>
      </div>
      <div className={clsx('flex-1 space-y-1.5 overflow-auto', compact ? 'text-[11px]' : '')}>
        {team.players.map((p) => {
          const weapon = WEAPON_MAP[p.equipment.weaponId];
          return (
            <div
              key={p.cardInstanceId}
              className={clsx(
                'rounded-lg border px-2 py-1.5 transition-colors duration-150',
                p.alive ? 'border-white/5 bg-white/[0.03] hover:border-white/15' : 'border-danger/20 bg-danger/[0.06]',
                !p.alive && 'opacity-60',
              )}
            >
              <div className='flex items-center justify-between gap-1.5'>
                <div className='flex min-w-0 items-center gap-1'>
                  {p.alive ? null : <Skull size={11} className='shrink-0 text-danger' />}
                  <span className={clsx('truncate font-semibold', p.alive ? 'text-txt' : 'text-txt-muted line-through')}>
                    {p.nickname}
                  </span>
                  {p.isIGL ? (
                    <span title='场上指挥' className='shrink-0'>
                      <Star size={10} className='text-accent' />
                    </span>
                  ) : null}
                </div>
                <span className='shrink-0 font-mono text-[10px] text-txt-muted'>{moneyLabel(p.money)}</span>
              </div>
              <div className='mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10'>
                <div
                  className={clsx('h-full rounded-full transition-all duration-300', hpTone(p.hp))}
                  style={{ width: hpWidth(p.hp) }}
                />
              </div>
              <div className='mt-1 flex items-center justify-between gap-1 text-[10px] text-txt-muted'>
                <span className='truncate'>
                  <span className='mr-1 rounded bg-white/5 px-1 py-px text-[9px] uppercase tracking-wide text-txt-muted'>{ROLE_LABEL[p.role]}</span>
                  {weapon ? weapon.name : '空手'}
                </span>
                <span className='shrink-0 font-mono'>
                  {p.stats.kills}/{p.stats.deaths}/{p.stats.assists}
                  {p.roundKills > 0 ? <span className='ml-1 text-accent'>+{p.roundKills}</span> : null}
                </span>
              </div>
            </div>
          );
        })}
        {team.players.length === 0 ? (
          <div className='rounded-lg border border-dashed border-white/10 px-2 py-4 text-center text-[11px] text-txt-muted'>
            暂无阵容数据。
          </div>
        ) : null}
      </div>
      <div className='mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-txt-muted'>
        <span>连败奖励</span>
        <span className='font-mono'>{moneyLabel(team.lossBonus)}</span>
      </div>
    </div>
  );
}
