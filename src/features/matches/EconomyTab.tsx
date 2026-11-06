import { useT } from '@/hooks/useLang';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity } from 'lucide-react';
import type { MatchState } from '@/types';
import { StatTile } from '@/components/ui';
import { moneyLabel } from './matchUi';

/** Per-round bank of each side, straight from RoundRecord.economy. */
export function EconomyTab({ match }: { match: MatchState }) {
  const { tr } = useT();
  const data = match.rounds.map((r) => ({
    round: r.roundNumber,
    t: r.economy.t,
    ct: r.economy.ct,
  }));
  const yourBank = match.teams.A.players.reduce((sum, p) => sum + p.money, 0);
  const theirBank = match.teams.B.players.reduce((sum, p) => sum + p.money, 0);
  const yourHistory = match.teams.A.economyHistory;
  const theirHistory = match.teams.B.economyHistory;
  const lastIndex = Math.min(yourHistory.length, theirHistory.length) - 1;

  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
        <StatTile label={tr('我方资金')} value={moneyLabel(yourBank)} hint={tr('第 ') + match.roundNumber + tr(' 回合')} />
        <StatTile label={tr('对手资金')} value={moneyLabel(theirBank)} hint={match.teams.B.name} />
        <StatTile
          label={tr('我方上回合结算')}
          value={lastIndex >= 0 ? moneyLabel(yourHistory[lastIndex]) : '—'}
          hint={tr('回合结束后的团队资金')}
        />
        <StatTile
          label={tr('对手上回合结算')}
          value={lastIndex >= 0 ? moneyLabel(theirHistory[lastIndex]) : '—'}
          hint={tr('回合结束后的团队资金')}
        />
      </div>
      {data.length === 0 ? (
        <div className='flex h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-center'>
          <Activity size={18} className='text-txt-muted' />
          <p className='text-[13px] text-txt-muted'>
            {tr('暂无经济记录。打完第一回合后图表就会填充。')}
          </p>
        </div>
      ) : (
        <div className='h-[240px] w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id='econT' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#F5A623' stopOpacity={0.45} />
                  <stop offset='100%' stopColor='#F5A623' stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id='econCT' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#60A5FA' stopOpacity={0.4} />
                  <stop offset='100%' stopColor='#60A5FA' stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' stroke='#252E3D' vertical={false} />
              <XAxis dataKey='round' stroke='#9CA3AF' tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                stroke='#9CA3AF'
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => '$' + Math.round(Number(v) / 1000) + 'k'}
              />
              <Tooltip
                contentStyle={{
                  background: '#151A23',
                  border: '1px solid #252E3D',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelFormatter={(v) => tr('第 ') + v + tr(' 回合')}
              />
              <Area type='monotone' dataKey='t' name={tr('T 方资金')} stroke='#F5A623' fill='url(#econT)' strokeWidth={2} />
              <Area type='monotone' dataKey='ct' name={tr('CT 方资金')} stroke='#60A5FA' fill='url(#econCT)' strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className='text-[12px] leading-snug text-txt-muted'>
        {tr('数值为双方回合结束时的资金，由引擎在下一次购买前记录。半场后交换阵营，所以 T 与 CT 两条线代表阵营，而不是队伍。')}
      </p>
    </div>
  );
}
