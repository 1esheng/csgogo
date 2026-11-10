import React from 'react';
import { useT } from '@/hooks/useLang';
import { localizeDynamic } from '@/i18n';
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
        <span className='font-display text-[15px] font-semibold text-txt'>{value}</span>
      </div>
      <div className='mt-1'>
        <Progress value={value} max={max} tone={tone} height='h-1.5' />
      </div>
      {hint ? <div className='mt-1 text-[12px] leading-snug text-txt-muted'>{hint}</div> : null}
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
  const { tr } = useT();
  const synergyBonusPct = (breakdown.synergy / 100) * SYNERGY.maxBonus * 100;
  const matchesToCap = Math.max(0, Math.ceil((SYNERGY.max - breakdown.synergy) / SYNERGY.perMatchGain));
  const map = MAPS[mapId];
  const iglSlot = breakdown.slots.find((slot) => slot.isIGL);

  return (
    <div className='h-fit space-y-4 xl:sticky xl:top-24'>
      <Panel className='space-y-4'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <div className='label-xs'>{tr('阵容综合')}</div>
            <div className='font-display text-4xl font-semibold leading-none text-accent'>{breakdown.ovr}</div>
            <div className='mt-1 text-[12px] text-txt-muted'>
              {breakdown.filled}/5 {tr('位置')} · {tr('平均适配')} {breakdown.averageFit}%
            </div>
          </div>
          <Badge tone={breakdown.filled === 5 ? 'success' : 'danger'}>
            {breakdown.filled === 5 ? tr('可开赛') : tr('阵容不完整')}
          </Badge>
        </div>

        <div>
          <div className='mb-1.5 label-xs'>{tr('备战地图')}</div>
          <Tabs tabs={MAP_TABS} active={mapId} onChange={(id) => onMapChange(id as MapId)} />
          <p className='mt-1.5 text-[12px] leading-relaxed text-txt-muted'>{tr(map.tagline)}</p>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <Meter label={tr('进攻')} value={breakdown.attack} max={100} tone='danger' />
          <Meter label={tr('防守')} value={breakdown.defense} max={100} tone='blue' />
          <Meter label={tr('默契')} value={breakdown.synergy} max={SYNERGY.max} tone='accent' />
          <Meter
            label={tr('地图适应')}
            value={breakdown.averageMapComfort}
            max={100}
            tone='blue'
            hint={tr('当前地图') + ' ' + map.name}
          />
        </div>

        <div className='rounded-xl border border-white/5 bg-ink-900/50 p-2.5'>
          <div className='flex items-center justify-between'>
            <span className='flex items-center gap-1.5 label-xs'>
              <Crown size={12} className='text-accent' />
              {iglSlot ? iglSlot.nickname + ' · ' + tr('场上指挥') : tr('场上指挥加成')}
            </span>
            <span className='font-display text-[15px] font-semibold text-txt'>{breakdown.iglLeadership}</span>
          </div>
          <div className='mt-1'>
            <Progress value={breakdown.iglLeadership} max={100} tone={breakdown.iglLeadership >= 60 ? 'success' : 'accent'} height='h-1.5' />
          </div>
          <p className='mt-1 text-[12px] leading-snug text-txt-muted'>
            {breakdown.iglLeadership > 0
              ? tr('被加冕选手的指挥能力最高可转化为 +3% 阵容战力，中期决策也更稳。')
              : iglAssigned && !iglFielded
                ? tr('你指定的场上指挥不在首发阵容中，指挥加成未生效。请给场上的选手加冕。')
                : tr('还没有指定场上指挥——给阵容中的一名选手加冕。')}
          </p>
        </div>

        <div className='space-y-1.5'>
          <div className='label-xs'>{tr('位置适配')}</div>
          {breakdown.slots.map((slot) => (
            <div key={slot.slot} className='flex items-center gap-2'>
              <span className='w-14 shrink-0 text-[12px] font-semibold text-txt-muted'>{tr(ROLE_LABEL[slot.slot])}</span>
              <span className='w-16 shrink-0 truncate text-[12px] text-txt'>{slot.nickname}</span>
              <span className='min-w-0 flex-1'>
                <Progress value={slot.fit} tone={fitTone(slot.fit)} height='h-1.5' />
              </span>
              <span className='w-9 shrink-0 text-right text-[12px] text-txt-muted'>
                {slot.instanceId ? slot.fit + '%' : '—'}
              </span>
            </div>
          ))}
        </div>

        {breakdown.warnings.length > 0 ? (
          <div className='rounded-xl border border-accent/25 bg-accent/10 p-2.5'>
            <div className='mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-accent'>
              <AlertTriangle size={12} /> {tr('阵容提示')}
            </div>
            <ul className='space-y-1'>
              {breakdown.warnings.map((warning) => (
                <li key={warning} className='text-[12px] leading-snug text-accent/90'>· {localizeDynamic(warning)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={clsx('rounded-xl border border-white/10 bg-ink-900/60 p-3')}>
          <div className='flex items-center justify-between'>
            <span className='label-xs'>{tr('团队默契')}</span>
            <span className='font-display text-[15px] font-semibold text-txt'>
              {breakdown.synergy}
              <span className='text-[12px] text-txt-muted'>/{SYNERGY.max}</span>
            </span>
          </div>
          <div className='mt-1'>
            <Progress value={breakdown.synergy} max={SYNERGY.max} tone='accent' height='h-1.5' />
          </div>
          <p className='mt-1.5 text-[12px] leading-relaxed text-txt-muted'>
            {tr('0–100 的团队默契：初始')} {SYNERGY.base}{tr('，每场比赛约 +')}{SYNERGY.perMatchGain}{tr('，每次训练赛约 +')}{SYNERGY.perTrainingGain}{tr('，上限')} {SYNERGY.max}{tr('，最高可转化为 +')}{Math.round(SYNERGY.maxBonus * 100)}%{tr(' 阵容战力。')}
            {matchesToCap > 0
              ? ' ' + tr('还需约') + ' ' + matchesToCap + ' ' + tr('场比赛才能到顶。')
              : ' ' + tr('默契已经到顶。')}
          </p>
          <div className='mt-1.5 space-y-1 border-t border-white/5 pt-1.5'>
            <div className='flex items-center justify-between text-[12px] text-txt-muted'>
              <span>{tr('默契带来的战力加成')}</span>
              <span className='font-semibold text-txt'>+{synergyBonusPct.toFixed(1)}%</span>
            </div>
            <div className='flex items-center justify-between text-[12px] text-txt-muted'>
              <span>{tr('双人化学反应加成')}</span>
              <span className='font-semibold text-txt'>+{breakdown.chemistry.toFixed(1)} {tr('评分')}</span>
            </div>
          </div>
        </div>

        <div className='space-y-1.5'>
          <Button
            className='w-full'
            size='lg'
            disabled={startBlockedReason !== null}
            title={startBlockedReason ?? tr('前往训练赛')}
            onClick={onStartMatch}
          >
            <Swords size={16} /> {tr('开始比赛')}
          </Button>
          <p className='text-center text-[12px] leading-snug text-txt-muted'>
            {startBlockedReason ?? tr('阵容齐整——前往训练赛配置战术。')}
          </p>
        </div>
      </Panel>
    </div>
  );
}