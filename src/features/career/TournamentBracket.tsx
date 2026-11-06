import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { MapPin } from 'lucide-react';
import type { Tournament, TournamentMatch } from '@/types';
import { MAPS } from '@/data/maps';
import { tournamentRoundName, tournamentRounds } from '@/game/career';
import { Badge } from '@/components/ui';



function TeamRow({
  name, score, won, decided, isPlayer,
}: { name: string; score: number; won: boolean; decided: boolean; isPlayer: boolean }) {
  const { tr } = useT();
  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
        won && decided ? 'bg-accent/12' : 'bg-white/[0.03]',
      )}
    >
      <span
        className={clsx(
          'min-w-0 flex-1 truncate text-xs font-semibold',
          decided && !won ? 'text-txt-muted' : 'text-txt',
        )}
      >
        {name}
      </span>
      {isPlayer ? <Badge tone='accent' className='shrink-0'>{tr('我')}</Badge> : null}
      <span className={clsx('w-6 shrink-0 text-right font-display text-sm font-semibold', won && decided ? 'text-accent' : 'text-txt-muted')}>
        {decided ? score : '–'}
      </span>
    </div>
  );
}

function MatchCard({ tournament, match }: { tournament: Tournament; match: TournamentMatch }) {
  const { tr } = useT();
  const a = tournament.teams.find((t) => t.id === match.aId);
  const b = tournament.teams.find((t) => t.id === match.bId);
  const decided = match.winnerId !== null;
  const mapName = MAPS[match.mapId]?.name ?? match.mapId;
  return (
    <div className='rounded-xl border border-white/8 bg-ink-700/40 p-2 transition-colors duration-150 hover:border-accent/30'>
      <div className='space-y-1'>
        <TeamRow name={a?.name ?? tr('待定')} score={match.scoreA} won={match.winnerId === match.aId} decided={decided} isPlayer={Boolean(a?.isPlayer)} />
        <TeamRow name={b?.name ?? tr('待定')} score={match.scoreB} won={match.winnerId === match.bId} decided={decided} isPlayer={Boolean(b?.isPlayer)} />
      </div>
      <div className='mt-1.5 flex items-center gap-1 px-1 text-[10px] text-txt-muted'>
        <MapPin size={10} /> {mapName}
      </div>
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className='flex h-[86px] items-center justify-center rounded-xl border border-dashed border-white/8 px-2 text-center text-[11px] text-txt-muted'>
      {label}
    </div>
  );
}

/** 单败淘汰对阵表（8 队或 16 队），全部读自存档里的赛事数据。 */
export function TournamentBracket({ tournament }: { tournament: Tournament }) {
  const { tr } = useT();
  const size = tournament.size || tournament.teams.length || 8;
  const total = tournamentRounds(tournament);
  const rounds = Array.from({ length: total }, (_x, i) => i + 1);
  return (
    <div className='no-scrollbar overflow-x-auto'><div className='grid min-w-[720px] gap-3' style={{ gridTemplateColumns: 'repeat(' + total + ', minmax(120px, 1fr))' }}>
      {rounds.map((round) => {
        const matches = tournament.matches
          .filter((m) => m.round === round)
          .sort((x, y) => x.slot - y.slot);
        const slotCount = size / Math.pow(2, round);
        return (
          <div key={round} className='flex flex-col gap-2'>
            <div className='label-xs mb-1 flex items-center justify-between'>
              <span>{tr(tournamentRoundName(round, size))}</span>
              <span className='text-txt-muted/70'>{matches.filter((m) => m.winnerId).length}/{slotCount}</span>
            </div>
            <div className={clsx('flex flex-1 flex-col gap-2', round > 1 && 'lg:justify-center')}>
              {Array.from({ length: slotCount }).map((_, index) => {
                const match = matches[index];
                return match ? (
                  <MatchCard key={match.id} tournament={tournament} match={match} />
                ) : (
                  <EmptySlot key={round + '-' + index} label={tr('等待结果')} />
                );
              })}
            </div>
          </div>
        );
      })}
    </div></div>
  );
}