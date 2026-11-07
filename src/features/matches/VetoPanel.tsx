import { useState } from 'react';
import clsx from 'clsx';
import { Check, RotateCcw, Undo2 } from 'lucide-react';
import { MAP_ART } from '@/data/mapArt';
import { MAPS } from '@/data/maps';
import { useT } from '@/hooks/useLang';
import { trVeto } from '@/i18n/areas/veto';
import { Button } from '@/components/ui';
import type { MapId } from '@/types';
import {
  VETO_FORMATS, applyVetoChoice, createVeto, currentVetoStep, isVetoComplete, undoVetoChoice,
  vetoBanned, vetoPicked, vetoResultMap, type VetoFormat, type VetoSide, type VetoState,
} from '@/game/veto';

export interface VetoPanelProps {
  /** 本局地图池，来自 data（现有 7 张）。 */
  pool: MapId[];
  comfort: Record<string, number>;
  /** BP 结束、剩下一张图时回调一次，由调用方回填 selectedMap。 */
  onResolve: (mapId: MapId) => void;
}

/** 地图 BP 演练：显示 7 张地图卡与当前步骤，点选推进，结束后回填唯一剩下的决胜图。 */
export function VetoPanel({ pool, comfort, onResolve }: VetoPanelProps) {
  const { tr } = useT();
  const [format, setFormat] = useState<VetoFormat>('BO1');
  const [firstSide, setFirstSide] = useState<VetoSide>('us');
  const [veto, setVeto] = useState<VetoState>(() => createVeto(pool, 'BO1', 'us'));
  const [error, setError] = useState<string | null>(null);

  const step = currentVetoStep(veto);
  const done = isVetoComplete(veto);
  const decided = vetoResultMap(veto);
  const banned = vetoBanned(veto);
  const picked = vetoPicked(veto);

  const resetTo = (nextFormat: VetoFormat, nextSide: VetoSide) => {
    setFormat(nextFormat);
    setFirstSide(nextSide);
    setVeto(createVeto(pool, nextFormat, nextSide));
    setError(null);
  };

  const take = (id: MapId) => {
    const result = applyVetoChoice(veto, id);
    if (!result.ok) {
      setError(tr(result.error));
      return;
    }
    setError(null);
    setVeto(result.state);
    const map = vetoResultMap(result.state);
    if (map) onResolve(map);
  };

  return (
    <div className='space-y-2'>
      {/* 赛制与先手：两者一起决定接下来 6 步的动作与出手顺序。 */}
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-2.5 py-2'>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='label-xs'>{trVeto('赛制')}</span>
          {VETO_FORMATS.map((f) => (
            <Chip
              key={f}
              active={f === format}
              label={f}
              title={f === 'BO1' ? trVeto('BO1：六次 BAN 留一张决胜图。') : trVeto('BO3：两 BAN、两 PICK、两 BAN，留一张决胜图。')}
              onClick={() => resetTo(f, firstSide)}
            />
          ))}
        </div>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='label-xs'>{trVeto('先手')}</span>
          <Chip
            active={firstSide === 'us'}
            label={trVeto('我方先手')}
            onClick={() => resetTo(format, 'us')}
          />
          <Chip
            active={firstSide === 'them'}
            label={trVeto('对手先手')}
            onClick={() => resetTo(format, 'them')}
          />
        </div>
      </div>

      {/* 当前步骤：出手方用琥珀边框标识，右侧是推进与回退。 */}
      <div className='rounded-xl border border-white/[0.07] bg-ink-900/40 px-2.5 py-2'>
        <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2'>
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5'>
            <SideTag label={tr('我方')} active={!done && step?.side === 'us'} />
            <SideTag label={tr('对手')} active={!done && step?.side === 'them'} />
            <span className='text-[12px] text-txt-muted'>
              {done ? (
                <span className='font-semibold text-txt'>
                  {trVeto('BP 结束 · 决胜图 ')}{decided ? MAPS[decided].name : '—'}
                </span>
              ) : (
                <>
                  <span className='font-mono tabular-nums'>
                    {trVeto('步骤')} {veto.entries.length + 1} / {veto.steps.length}
                  </span>
                  <span className='mx-1 text-txt-muted/60'>·</span>
                  <span className='font-semibold text-txt'>
                    {step?.side === 'us' ? tr('我方') : tr('对手')} {step?.action === 'pick' ? trVeto('PICK') : trVeto('BAN')}
                  </span>
                </>
              )}
            </span>
          </div>
          <div className='flex items-center gap-1.5'>
            <Button
              variant='subtle'
              size='sm'
              onClick={() => { setVeto(undoVetoChoice(veto)); setError(null); }}
              disabled={veto.entries.length === 0}
            >
              <Undo2 size={12} /> {trVeto('撤销')}
            </Button>
            <Button
              variant='subtle'
              size='sm'
              onClick={() => resetTo(format, firstSide)}
              disabled={veto.entries.length === 0}
            >
              <RotateCcw size={12} /> {trVeto('重新开始')}
            </Button>
          </div>
        </div>
        {veto.entries.length > 0 ? (
          <ol className='mt-1.5 flex flex-wrap gap-1 border-t border-white/[0.06] pt-1.5'>
            {veto.entries.map((entry) => (
              <li
                key={entry.mapId}
                className='inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-txt-muted'
              >
                <span className={clsx('font-mono text-[10px] font-semibold', entry.step.action === 'pick' ? 'text-emerald-300' : 'text-txt-muted')}>
                  {entry.step.side === 'us' ? tr('我方') : tr('对手')}
                </span>
                <span className={clsx(entry.step.action === 'ban' && 'line-through')}>{MAPS[entry.mapId].name}</span>
                <span className='text-[10px]'>{entry.step.action === 'pick' ? trVeto('PICK') : trVeto('BAN')}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {/* 地图池：可选的能点，已 BAN 的置灰划线，已 PICK 的带勾选。 */}
      <div className='grid gap-1.5 sm:grid-cols-2'>
        {pool.map((id) => {
          const spec = MAPS[id];
          const isBanned = banned.includes(id);
          const isPicked = picked.includes(id);
          const isDecided = decided === id;
          const available = !isBanned && !isPicked && !done;
          return (
            <button
              key={id}
              type='button'
              data-veto-map={id}
              disabled={!available}
              onClick={() => take(id)}
              aria-pressed={isDecided}
              title={available ? trVeto('点选地图推进一步。') : undefined}
              className={clsx(
                'focus-ring t-colors flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left',
                isDecided && 'border-accent/50 bg-accent/10',
                isPicked && !isDecided && 'border-emerald-500/25 bg-emerald-500/[0.06]',
                isBanned && 'border-white/[0.05] bg-transparent opacity-45',
                available && 'border-white/[0.07] bg-white/[0.02] hover:border-accent/50 hover:bg-white/[0.04]',
                !available && !isDecided && 'cursor-default',
              )}
            >
              {MAP_ART[id] ? (
                <img src={MAP_ART[id]} alt='' aria-hidden className='h-7 w-7 shrink-0 rounded object-contain opacity-80' />
              ) : (
                <span aria-hidden className='h-7 w-7 shrink-0 rounded bg-white/[0.06]' />
              )}
              <span
                className={clsx(
                  'min-w-0 flex-1 truncate text-[13px] font-semibold',
                  isBanned && 'text-txt-muted line-through',
                  isDecided && 'text-accent',
                  !isBanned && !isDecided && 'text-txt',
                )}
              >
                {spec.name}
              </span>
              <span className='shrink-0 font-mono text-[12px] tabular-nums text-txt-muted'>
                <span className='inline-block min-w-[3ch] text-right text-txt'>{Math.round(comfort[id] ?? 0)}</span>%
              </span>
              {isBanned ? (
                <span className='shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-txt-muted'>
                  {trVeto('已 BAN')}
                </span>
              ) : null}
              {isPicked ? (
                <span className='inline-flex shrink-0 items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300'>
                  <Check size={9} /> {trVeto('已 PICK')}
                </span>
              ) : null}
              {isDecided ? (
                <span className='shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent'>
                  {trVeto('决胜图')}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className='rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-[12px] text-danger'>{error}</p>
      ) : (
        <p className='text-[12px] text-txt-muted'>
          {done ? trVeto('BP 已完成，选图已回填。') : trVeto('点选地图推进一步。')}
        </p>
      )}
    </div>
  );
}

/** 出手方标识：轮到谁，谁就戴上琥珀边框。 */
function SideTag({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={clsx(
        't-colors inline-flex items-center rounded-md border px-2 py-0.5 text-[12px] font-semibold',
        active ? 'border-accent/60 bg-accent/10 text-accent' : 'border-white/[0.08] text-txt-muted',
      )}
    >
      {label}
    </span>
  );
}

function Chip({ active, label, title, onClick }: { active: boolean; label: string; title?: string; onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={clsx(
        'focus-ring t-colors inline-flex items-center rounded-md border px-2 py-0.5 text-[12px] font-semibold',
        active
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-white/[0.08] text-txt-muted hover:border-white/20 hover:text-txt',
      )}
    >
      {label}
    </button>
  );
}
