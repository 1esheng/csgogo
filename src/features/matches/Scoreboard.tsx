import { useMemo, useState } from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, Crown } from 'lucide-react';
import type { MatchStatLine } from '@/types';
import { Badge } from '@/components/ui';
import { tr } from '@/i18n';
import { sideTone } from './matchUi';

type SortKey =
  | 'nickname' | 'kills' | 'deaths' | 'assists' | 'adr' | 'kast' | 'kd'
  | 'rating' | 'openingKills' | 'multiKills' | 'clutches';

interface Column {
  key: SortKey;
  label: string;
  hint: string;
}

/** Built per render so the header hints follow the active language. */
function columns(): Column[] {
  return [
    { key: 'kills', label: 'K', hint: tr('击杀') },
    { key: 'deaths', label: 'D', hint: tr('阵亡') },
    { key: 'assists', label: 'A', hint: tr('助攻') },
    { key: 'adr', label: 'ADR', hint: tr('每回合平均伤害') },
    { key: 'kast', label: 'KAST%', hint: tr('有击杀、助攻、存活或补枪的回合占比') },
    { key: 'kd', label: 'K/D', hint: tr('击杀阵亡比') },
    { key: 'rating', label: tr('评分'), hint: tr('由 K/D、ADR 与助攻算出的引擎评分') },
    { key: 'openingKills', label: 'OK', hint: tr('首杀数') },
    { key: 'multiKills', label: 'MK', hint: tr('单回合 2 杀及以上的次数') },
    { key: 'clutches', label: '1vX', hint: tr('残局获胜次数') },
  ];
}

export function ScoreTable({
  lines, highlightTeamId, mvpId,
}: { lines: MatchStatLine[]; highlightTeamId?: string; mvpId?: string | null }) {
  const { tr } = useT();
  const [sortKey, setSortKey] = useState<SortKey>('rating');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const copy = [...lines];
    copy.sort((a, b) => {
      if (sortKey === 'nickname') {
        const cmp = a.nickname.localeCompare(b.nickname);
        return dir === 'asc' ? cmp : -cmp;
      }
      const diff = a[sortKey] - b[sortKey];
      if (diff !== 0) return dir === 'asc' ? diff : -diff;
      return b.rating - a.rating;
    });
    return copy;
  }, [lines, sortKey, dir]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) {
      setDir(dir === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setDir(key === 'nickname' || key === 'deaths' ? 'asc' : 'desc');
  };

  if (lines.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-txt-muted'>
        {tr('暂无计分板数据 —— 打完一回合后就会填充。')}
      </div>
    );
  }

  return (
    <div className='max-h-[42vh] overflow-auto'>
      <table className='w-full border-collapse text-sm'>
        <thead className='sticky top-0 z-10 bg-ink-800/95 backdrop-blur'>
          <tr className='text-[10px] text-txt-muted'>
            <th className='px-2 py-2 text-left'>
              <button
                onClick={() => toggle('nickname')}
                className='focus-ring inline-flex items-center gap-1 rounded hover:text-txt'
                title={tr('按昵称排序')}
              >
                {tr('选手')}
                {sortKey === 'nickname' ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null}
              </button>
            </th>
            {columns().map((col) => (
              <th key={col.key} className='px-1.5 py-2 text-right'>
                <button
                  onClick={() => toggle(col.key)}
                  title={col.hint}
                  className={clsx(
                    'focus-ring inline-flex items-center gap-0.5 rounded hover:text-txt',
                    sortKey === col.key && 'text-accent',
                  )}
                >
                  {col.label}
                  {sortKey === col.key ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((line) => {
            const mine = highlightTeamId !== undefined && line.teamId === highlightTeamId;
            const isMvp = mvpId !== undefined && mvpId !== null && line.cardInstanceId === mvpId;
            return (
              <tr
                key={line.cardInstanceId + line.teamId}
                className={clsx(
                  'border-t border-white/5 transition-colors',
                  mine ? 'bg-accent/[0.06] hover:bg-accent/10' : 'hover:bg-white/[0.04]',
                )}
              >
                <td className='max-w-[190px] px-2 py-1.5'>
                  <div className='flex items-center gap-1.5'>
                    <Badge tone={sideTone(line.side)} className='shrink-0 px-1 py-0'>{line.side}</Badge>
                    <span className={clsx('truncate font-semibold', mine ? 'text-txt' : 'text-txt-muted')}>{line.nickname}</span>
                    {isMvp ? <Crown size={12} className='shrink-0 text-accent' /> : null}
                  </div>
                </td>
                <td className='px-1.5 py-1.5 text-right font-mono'>{line.kills}</td>
                <td className='px-1.5 py-1.5 text-right font-mono text-txt-muted'>{line.deaths}</td>
                <td className='px-1.5 py-1.5 text-right font-mono text-txt-muted'>{line.assists}</td>
                <td className='px-1.5 py-1.5 text-right font-mono'>{line.adr.toFixed(1)}</td>
                <td className='px-1.5 py-1.5 text-right font-mono'>{line.kast.toFixed(0)}</td>
                <td className='px-1.5 py-1.5 text-right font-mono'>{line.kd.toFixed(2)}</td>
                <td className={clsx('px-1.5 py-1.5 text-right font-mono font-semibold', line.rating >= 1.1 ? 'text-accent' : line.rating < 0.85 ? 'text-danger' : 'text-txt')}>
                  {line.rating.toFixed(2)}
                </td>
                <td className='px-1.5 py-1.5 text-right font-mono text-txt-muted'>{line.openingKills}</td>
                <td className='px-1.5 py-1.5 text-right font-mono text-txt-muted'>{line.multiKills}</td>
                <td className='px-1.5 py-1.5 text-right font-mono text-txt-muted'>{line.clutches}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className='mt-2 px-2 text-[10px] text-txt-muted'>
        {tr('评分、ADR 与 KAST 都由引擎根据模拟事件计算。点击表头即可排序。')}
      </p>
    </div>
  );
}
