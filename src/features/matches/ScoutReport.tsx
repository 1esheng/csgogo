import { useMemo } from 'react';
import clsx from 'clsx';
import { Crosshair, FileSearch, Lock, MapPin, Radar } from 'lucide-react';
import type { AITeamSpec, CombatRole } from '@/types';
import { ROLE_LABEL } from '@/types';
import { MAPS } from '@/data/maps';
import { averageOvr, lineupFromSpec } from '@/engine/lineup';
import { useT } from '@/hooks/useLang';
import { Button } from '@/components/ui';
import { scoutPrice, tacticInfo, useGameStore } from '@/stores/gameStore';
import { ECON_STYLE_LABEL } from './matchUi';

/**
 * 侦察报告：全部指标直接读 AI 战队现有数据（econStyle / mapPref / tTactics /
 * ctTactics / adaptivity 与五人卡片 OVR），不新增、不编造任何指标。
 */
export interface ScoutRosterEntry {
  nickname: string;
  role: CombatRole;
  ovr: number;
}

export interface ScoutIntel {
  econStyle: AITeamSpec['econStyle'];
  econLine: string;
  mapNames: string[];
  roster: ScoutRosterEntry[];
  averageOvr: number;
  tTactics: string[];
  ctTactics: string[];
  adaptivity: number;
  adaptivityLine: string;
}

/** 经济风格的真实后果在 engine/economy.decideBuy：aggressive 会把强起/满买阈值各降 350。 */
const ECON_LINE: Record<AITeamSpec['econStyle'], string> = {
  conservative: '经济保守：宁可不买枪也不勉强强起。',
  balanced: '经济均衡：按钱包厚度决定买什么。',
  aggressive: '偏好强起：宁可压上库存也要抢下这一分。',
};

/** adaptivity 在 engine/ai.ts 里同时控制「连丢两回合后换战术」与「针对你反制」的判定概率。 */
function adaptivityLine(value: number): string {
  if (value >= 0.6) return '调整很快：连丢两回合后大概率换战术，也会针对你的打法反制。';
  if (value >= 0.3) return '会变阵：连丢两回合后有可能换战术。';
  return '很少变阵：连丢两回合之后通常还打同一套。';
}

function tacticNames(ids: string[], limit: number): string[] {
  return ids.slice(0, limit).map((id) => tacticInfo(id)?.name ?? id);
}

/** 千分位：价格与差额都要一眼读得懂。 */
export function priceLabel(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function buildScoutIntel(spec: AITeamSpec): ScoutIntel {
  const lineup = lineupFromSpec(spec);
  return {
    econStyle: spec.econStyle,
    econLine: ECON_LINE[spec.econStyle],
    mapNames: spec.mapPref.map((id) => MAPS[id]?.name ?? id),
    roster: lineup
      .map((player) => ({ nickname: player.nickname, role: player.role, ovr: player.ovr }))
      .sort((a, b) => b.ovr - a.ovr),
    averageOvr: averageOvr(lineup),
    tTactics: tacticNames(spec.tTactics, 2),
    ctTactics: tacticNames(spec.ctTactics, 2),
    adaptivity: spec.adaptivity,
    adaptivityLine: adaptivityLine(spec.adaptivity),
  };
}

/**
 * 比赛准备页对手卡里的一小块：未购买只给免费的风格标签 + 一次性买断价，
 * 付费后展开经济习惯、地图偏好、临场调整、战术菜单与五人实力。
 * 挂载方式见交付报告（OpponentCard 内一行 JSX）。
 */
export function OpponentScout({ spec, className }: { spec: AITeamSpec; className?: string }) {
  const { tr } = useT();
  const purchasedAt = useGameStore((s) => s.scoutReports[spec.id] ?? 0);
  const coins = useGameStore((s) => s.club.coins);
  const careerTier = useGameStore((s) => s.career.tier);
  const buyScoutReport = useGameStore((s) => s.buyScoutReport);
  const intel = useMemo(() => buildScoutIntel(spec), [spec]);
  const price = scoutPrice(spec, careerTier);
  const shortfall = Math.max(0, price - coins);
  const purchased = purchasedAt > 0;

  if (!purchased) {
    return (
      <div
        data-testid='scout-teaser'
        className={clsx(
          'rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-2 py-1.5',
          className,
        )}
      >
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <span className='inline-flex min-w-0 items-center gap-1 text-[12px] text-txt-muted'>
            <Lock size={11} className='shrink-0' />
            {tr('风格')}
            <span className='font-semibold text-txt'>{tr(ECON_STYLE_LABEL[intel.econStyle])}</span>
            <span className='text-txt-muted/70'>· {tr('其余情报未解锁')}</span>
          </span>
          <div className='flex flex-wrap items-center gap-2'>
            {shortfall > 0 ? (
              <span className='text-[11px] font-semibold text-danger'>
                {tr('金币不足，还差 ')}{priceLabel(shortfall)}{tr(' 金币')}
              </span>
            ) : null}
            <Button
              size='sm'
              variant='outline'
              disabled={shortfall > 0}
              onClick={() => buyScoutReport(spec.id)}
            >
              <FileSearch size={13} />
              {tr('购买情报（')}{priceLabel(price)}{tr(' 金币）')}
            </Button>
            <span className='text-[11px] text-txt-muted'>{tr('永久解锁')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid='scout-report'
      className={clsx('rounded-lg border border-accent/25 bg-accent/[0.06] px-2 py-1.5', className)}
    >
      <div className='flex items-center justify-between gap-2'>
        <span className='inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent'>
          <Radar size={11} /> {tr('侦察报告')}
        </span>
        <span className='text-[11px] text-txt-muted'>{tr('已解锁')}</span>
      </div>

      <div className='mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px] text-txt-muted'>
        <span className='inline-flex items-center gap-1'>
          <Crosshair size={10} />
          {tr('经济风格')}
          <span className='font-semibold text-txt'>{tr(ECON_STYLE_LABEL[intel.econStyle])}</span>
        </span>
        <span className='inline-flex items-center gap-1'>
          <MapPin size={10} />
          {tr('偏好地图')}
          <span className='font-semibold text-txt'>{intel.mapNames.join(' / ')}</span>
        </span>
      </div>

      <p className='mt-1 text-[12px] leading-snug text-txt-muted'>{tr(intel.econLine)}</p>
      <p className='mt-0.5 text-[12px] leading-snug text-txt-muted'>
        {tr('临场调整')}
        <span className='ml-1 font-mono tabular-nums text-txt'>{Math.round(intel.adaptivity * 100)}%</span>
        <span className='ml-1'>{tr(intel.adaptivityLine)}</span>
      </p>
      <p className='mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px] leading-snug text-txt-muted'>
        <span>
          {tr('T 侧开场')}
          <span className='ml-1 font-semibold text-txt'>{intel.tTactics.join(' / ')}</span>
        </span>
        <span>
          {tr('CT 侧布阵')}
          <span className='ml-1 font-semibold text-txt'>{intel.ctTactics.join(' / ')}</span>
        </span>
      </p>

      <ul className='mt-1 space-y-0.5'>
        {intel.roster.map((player) => (
          <li key={player.nickname} className='flex items-center justify-between gap-2 text-[12px]'>
            <span className='truncate text-txt'>{player.nickname}</span>
            <span className='flex shrink-0 items-baseline gap-2 text-[11px] text-txt-muted'>
              <span>{tr(ROLE_LABEL[player.role])}</span>
              <span className='font-mono font-semibold tabular-nums text-txt'>{player.ovr}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className='mt-1 flex items-baseline justify-between gap-2 text-[11px] text-txt-muted'>
        <span>{tr('五人实力（OVR 均值）')}</span>
        <span className='font-mono font-semibold tabular-nums text-txt'>{intel.averageOvr}</span>
      </p>
    </div>
  );
}
