import React from 'react';
import clsx from 'clsx';
import { AlertTriangle, Crown, Swords } from 'lucide-react';
import type { MapId } from '@/types';
import { ROLE_LABEL } from '@/types';
import { MAPS } from '@/data/maps';
import { SYNERGY } from '@/data/config';
import type { SquadBreakdown } from '@/engine/squad';
import { Badge, Button, Panel, Progress, Tabs } from '@/components/ui';

const MAP_TABS = (Object.keys(MAPS) as MapId[]).map((id) => ({ id, label: MAPS[id].name }));

export function fitTone(fit: number): 'accent' | 'danger' | 'success' | 'blue' {
  if (fit >= 85) return 'success';
  if (fit >= 65) return 'blue';
  if (fit >= 45) return 'accent';
  return 'danger';
}

function Meter({
  label, value, max, hint, tone,
}: { label: string; value: number; max: number; hint?: string; tone: 'accent' | 'danger' | 'success' | 'blue' }) {
  return (
    <div className='rounded-xl border border-white/5 bg-ink-900/50 p-2.5'>
      <div className='flex items-baseline justify-between gap-2'>
        <span className='label-xs'>{label}</span>
        <span className='font-display text-sm font-bold text-txt'>{value}</span>
      </div>
      <div className='mt-1'>
        <Progress value={value} max={max} tone={tone} height='h-1.5' />
      </div>
      {hint ? <div className='mt-1 text-[10px] leading-snug text-txt-muted'>{hint}</div> : null}
    </div>
  );
}

export function SquadAnalysis({
  breakdown, mapId, onMapChange, onStartMatch, startBlockedReason, iglAssigned, iglFielded,
}: {
  breakdown: SquadBreakdown;
  mapId: MapId;
  onMapChange: (mapId: MapId) => void;
  onStartMatch: () => void;
  startBlockedReason: string | null;
  iglAssigned: boolean;
  iglFielded: boolean;
}) {
  const synergyBonusPct = (breakdown.synergy / 100) * SYNERGY.maxBonus * 100;
  const matchesToCap = Math.max(0, Math.ceil((SYNERGY.max - breakdown.synergy) / SYNERGY.perMatchGain));
  const map = MAPS[mapId];
  const iglSlot = breakdown.slots.find((slot) => slot.isIGL);

  return (
    <div className='h-fit space-y-4 xl:sticky xl:top-24'>
      <Panel className='space-y-4'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <div className='label-xs'>阵容综合</div>
            <div className='font-display text-4xl font-black leading-none text-accent'>{breakdown.ovr}</div>
            <div className='mt-1 text-[11px] text-txt-muted'>
              {breakdown.filled}/5 位置 · 平均适配 {breakdown.averageFit}%
            </div>
          </div>
          <Badge tone={breakdown.filled === 5 ? 'success' : 'danger'}>
            {breakdown.filled === 5 ? '可开赛' : '阵容不完整'}
          </Badge>
        </div>

        <div>
          <div className='mb-1.5 label-xs'>备战地图</div>
          <Tabs tabs={MAP_TABS} active={mapId} onChange={(id) => onMapChange(id as MapId)} />
          <p className='mt-1.5 text-[10px] leading-relaxed text-txt-muted'>{map.tagline}</p>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <Meter label='进攻' value={breakdown.attack} max={100} tone='danger' />
          <Meter label='防守' value={breakdown.defense} max={100} tone='blue' />
          <Meter label='默契' value={breakdown.synergy} max={SYNERGY.max} tone='accent' />
          <Meter
            label='地图适应'
            value={breakdown.averageMapComfort}
            max={100}
            tone='blue'
            hint={'当前地图 ' + map.name}
          />
        </div>

        <div className='rounded-xl border border-white/5 bg-ink-900/50 p-2.5'>
          <div className='flex items-center justify-between'>
            <span className='flex items-center gap-1.5 label-xs'>
              <Crown size={12} className='text-accent' />
              {iglSlot ? iglSlot.nickname + ' · 场上指挥' : '场上指挥加成'}
            </span>
            <span className='font-display text-sm font-bold text-txt'>{breakdown.iglLeadership}</span>
          </div>
          <div className='mt-1'>
            <Progress value={breakdown.iglLeadership} max={100} tone={breakdown.iglLeadership >= 60 ? 'success' : 'accent'} height='h-1.5' />
          </div>
          <p className='mt-1 text-[10px] leading-snug text-txt-muted'>
            {breakdown.iglLeadership > 0
              ? '被加冕选手的指挥能力最高可转化为 +3% 阵容战力，中期决策也更稳。'
              : iglAssigned && !iglFielded
                ? '你指定的场上指挥不在首发阵容中，指挥加成未生效。请给场上的选手加冕。'
                : '还没有指定场上指挥——给阵容中的一名选手加冕。'}
          </p>
        </div>

        <div className='space-y-1.5'>
          <div className='label-xs'>位置适配</div>
          {breakdown.slots.map((slot) => (
            <div key={slot.slot} className='flex items-center gap-2'>
              <span className='w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-txt-muted'>{ROLE_LABEL[slot.slot]}</span>
              <span className='w-16 shrink-0 truncate text-[11px] text-txt'>{slot.nickname}</span>
              <span className='min-w-0 flex-1'>
                <Progress value={slot.fit} tone={fitTone(slot.fit)} height='h-1.5' />
              </span>
              <span className='w-9 shrink-0 text-right text-[10px] text-txt-muted'>
                {slot.instanceId ? slot.fit + '%' : '—'}
              </span>
            </div>
          ))}
        </div>

        {breakdown.warnings.length > 0 ? (
          <div className='rounded-xl border border-accent/25 bg-accent/10 p-2.5'>
            <div className='mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent'>
              <AlertTriangle size={12} /> 阵容提示
            </div>
            <ul className='space-y-1'>
              {breakdown.warnings.map((warning) => (
                <li key={warning} className='text-[11px] leading-snug text-accent/90'>· {warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={clsx('rounded-xl border border-white/10 bg-ink-900/60 p-3')}>
          <div className='flex items-center justify-between'>
            <span className='label-xs'>团队默契</span>
            <span className='font-display text-sm font-bold text-txt'>
              {breakdown.synergy}
              <span className='text-[11px] text-txt-muted'>/{SYNERGY.max}</span>
            </span>
          </div>
          <div className='mt-1'>
            <Progress value={breakdown.synergy} max={SYNERGY.max} tone='accent' height='h-1.5' />
          </div>
          <p className='mt-1.5 text-[11px] leading-relaxed text-txt-muted'>
            0–100 的团队默契：初始 {SYNERGY.base}，每场比赛约 +{SYNERGY.perMatchGain}，每次训练赛约 +{SYNERGY.perTrainingGain}，上限 {SYNERGY.max}，最高可转化为 +{Math.round(SYNERGY.maxBonus * 100)}% 阵容战力。
            {matchesToCap > 0
              ? ' 还需约 ' + matchesToCap + ' 场比赛才能到顶。'
              : ' 默契已经到顶。'}
          </p>
          <div className='mt-1.5 space-y-1 border-t border-white/5 pt-1.5'>
            <div className='flex items-center justify-between text-[11px] text-txt-muted'>
              <span>默契带来的战力加成</span>
              <span className='font-semibold text-txt'>+{synergyBonusPct.toFixed(1)}%</span>
            </div>
            <div className='flex items-center justify-between text-[11px] text-txt-muted'>
              <span>双人化学反应加成</span>
              <span className='font-semibold text-txt'>+{breakdown.chemistry.toFixed(1)} OVR</span>
            </div>
          </div>
        </div>

        <div className='space-y-1.5'>
          <Button
            className='w-full'
            size='lg'
            disabled={startBlockedReason !== null}
            title={startBlockedReason ?? '前往训练赛'}
            onClick={onStartMatch}
          >
            <Swords size={16} /> 开始比赛
          </Button>
          <p className='text-center text-[11px] leading-snug text-txt-muted'>
            {startBlockedReason ?? '阵容齐整——前往训练赛配置战术。'}
          </p>
        </div>
      </Panel>
    </div>
  );
}