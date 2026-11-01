import React from 'react';
import { useT } from '@/hooks/useLang';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABEL, ALL_ROLES, MAP_IDS } from '@/types';
import type { CardTemplate } from '@/types';
import { LEVEL_CONFIG, RARITY_TABLE } from '@/data/config';
import { MAPS } from '@/data/maps';
import { Avatar } from '@/components/Avatar';
import { avatarCredit } from '@/data/avatars';
import { playerBio, playerRetired, skillDescEn, skillNameEn } from '@/data/cards';
import { effectiveAttributes, ovrBreakdown } from '@/engine/rating';
import { Badge, Divider, Progress } from '@/components/ui';
import { Star } from 'lucide-react';

export function AttributeRadar({ values, labels, size = 244 }: { values: number[]; labels?: string[]; size?: number }) {
  const { tr } = useT();
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 46;
  const count = values.length;
  const point = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  const rings = [0.25, 0.5, 0.75, 1];
  const polygon = values.map((v, i) => point(i, (Math.max(0, Math.min(100, v)) / 100) * radius).join(',')).join(' ');
  return (
    <svg width={size + 30} height={size} viewBox={'-15 0 ' + (size + 30) + ' ' + size} className='mx-auto'>
      {rings.map((r) => (
        <polygon
          key={r}
          points={values.map((_v, i) => point(i, radius * r).join(',')).join(' ')}
          fill='none'
          stroke='rgba(255,255,255,0.08)'
          strokeWidth={1}
        />
      ))}
      {values.map((_v, i) => {
        const [x, y] = point(i, radius);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke='rgba(255,255,255,0.06)' strokeWidth={1} />;
      })}
      <polygon points={polygon} fill='rgba(245,166,35,0.22)' stroke='#F5A623' strokeWidth={1.6} />
      {values.map((v, i) => {
        const [x, y] = point(i, (Math.max(0, Math.min(100, v)) / 100) * radius);
        return <circle key={i} cx={x} cy={y} r={2.4} fill='#F5A623' />;
      })}
      {labels ? labels.map((label, i) => {
        const [x, y] = point(i, radius + 14);
        const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end';
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline='middle'
            fontSize={11}
            fill='rgba(203,213,225,0.85)'
          >
            {label}
            <tspan fill='#F5A623' fontSize={9} dx={2}>{values[i]}</tspan>
          </text>
        );
      }) : null}
    </svg>
  );
}

export function CardDetailBody({
  template, nickname, countryCode, ovr, level, stars = 1, xpPct, xpLabel, actions,
}: {
  template: CardTemplate;
  nickname: string;
  countryCode: string;
  ovr: number;
  level: number;
  /** 突破星级（1-5）。 */
  stars?: number;
  xpPct: number;
  xpLabel: string;
  actions?: React.ReactNode;
}) {
  const { tr, pick } = useT();
  const rarity = RARITY_TABLE[template.rarity];
  const credit = avatarCredit(template.playerId);
  const bio = playerBio(template.playerId);
  const retired = playerRetired(template.playerId);
  const breakdown = ovrBreakdown(effectiveAttributes(template, level), template.proficiency, template.primaryRole);
  const liveAttrs = effectiveAttributes(template, level, stars);
  const attrMax = Math.max(99, ...ATTRIBUTE_KEYS.map((k) => liveAttrs[k]));
  return (
    <div className='grid gap-6 md:grid-cols-[240px_1fr]'>
      <div>
        <div
          className='rounded-2xl border border-white/10 p-4'
          style={{ background: 'linear-gradient(160deg, ' + rarity.color + '22, rgba(21,26,35,0.9))' }}
        >
          <div className='flex items-center justify-between'>
            <Badge tone='neutral'>{countryCode}</Badge>
            <Badge tone='accent'>{rarity.label}</Badge>
          </div>
          <div className='mt-3 flex justify-center'>
            <Avatar
              playerId={template.playerId}
              nickname={nickname}
              size={104}
              accent={rarity.color}
              shape='square'
            />
          </div>
          <div className='mt-3 font-display text-2xl font-black'>{nickname}</div>
          <div className='text-xs tracking-wider text-txt-muted'>
            {template.season} {retired ? tr('生涯终章') : tr('赛季')}
            {retired ? <Badge tone='danger' className='ml-2'>{tr('已退役')}</Badge> : null}
          </div>
          {credit?.source ? (
            <div className='mt-1 text-[10px] text-txt-muted'>头像来源：{credit.source}</div>
          ) : null}
          <div className='mt-4 flex items-end justify-between'>
            <div>
              <div className='label-xs'>{tr('综合评分')}</div>
              <div className='font-display text-4xl font-black' style={{ color: rarity.color }}>{ovr}</div>
            </div>
            <div className='text-right'>
              <div className='label-xs'>{tr('等级 / 星级')}</div>
              <div className='font-display text-2xl font-bold'>{level}/{LEVEL_CONFIG.maxLevel}</div>
              <div className='mt-0.5 flex items-center justify-end gap-0.5 text-accent'>
                {Array.from({ length: Math.max(1, Math.min(5, stars)) }).map((_x, i) => (
                  <Star key={i} size={12} fill='currentColor' />
                ))}
                <span className='ml-1 text-[11px] text-txt-muted'>{stars} 星</span>
              </div>
            </div>
          </div>
          <div className='mt-3 space-y-1 rounded-lg bg-black/25 p-2 text-[11px] text-txt-muted'>
            <div className='flex justify-between'><span>{tr('个人能力 × 0.62')}</span><span className='font-semibold text-txt'>{breakdown.attributes}</span></div>
            <div className='flex justify-between'><span>{tr('位置熟练 × 0.20')}</span><span className='font-semibold text-txt'>{breakdown.proficiency}</span></div>
            <div className='flex justify-between'><span>{tr('指挥与团队 × 0.18')}</span><span className='font-semibold text-accent'>{breakdown.team}</span></div>
          </div>
          <div className='mt-3'><Progress value={xpPct * 100} label={tr('卡牌经验')} /></div>
          <div className='mt-1 text-[11px] text-txt-muted'>{xpLabel}</div>
        </div>
        {bio ? (
          <div className='mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3'>
            <div className='label-xs'>{tr('生涯简介')}</div>
            <p className='mt-1 text-xs leading-relaxed text-txt-muted'>{bio}</p>
          </div>
        ) : null}
        <div className='mt-4 rounded-xl border border-accent/20 bg-accent/5 p-3'>
          <div className='label-xs text-accent'>{tr('天赋技能')}</div>
          <div className='mt-1 font-display text-sm font-bold'>{pick(template.skill.name, skillNameEn(template.skill))}</div>
          <p className='mt-1 text-xs leading-relaxed text-txt-muted'>{pick(template.skill.description, skillDescEn(template.skill))}</p>
        </div>
      </div>

      <div className='space-y-5'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='surface p-4'>
            <div className='label-xs mb-1'>{tr('能力雷达')}</div>
            <AttributeRadar values={ATTRIBUTE_KEYS.map((k) => liveAttrs[k])} labels={ATTRIBUTE_KEYS.map((k) => ATTRIBUTE_LABEL[k])} />
          </div>
          <div className='surface space-y-2 p-4'>
            <div className='label-xs'>{tr('基础能力')}</div>
            {ATTRIBUTE_KEYS.map((key) => (
              <div key={key}>
                <div className='flex justify-between text-xs'>
                  <span className='text-txt-muted'>{tr(ATTRIBUTE_LABEL[key])}</span>
                  <span className='font-semibold text-txt'>{liveAttrs[key]}</span>
                </div>
                <Progress value={liveAttrs[key]} max={attrMax} height='h-1.5' tone={liveAttrs[key] >= attrMax * 0.9 ? 'accent' : 'blue'} />
              </div>
            ))}
          </div>
        </div>
        <Divider />
        <div className='grid gap-4 sm:grid-cols-2'>
          <div>
            <div className='label-xs mb-2'>{tr('位置熟练度')}</div>
            <div className='space-y-1.5'>
              {ALL_ROLES.map((role) => (
                <div key={role} className='flex items-center gap-2'>
                  <span className={role === template.primaryRole ? 'w-16 text-xs font-bold text-accent' : role === template.secondaryRole ? 'w-16 text-xs font-semibold text-txt' : 'w-16 text-xs text-txt-muted'}>{role}</span>
                  <div className='flex-1'><Progress value={template.proficiency[role]} height='h-1.5' /></div>
                  <span className='w-8 text-right text-xs text-txt-muted'>{template.proficiency[role]}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className='label-xs mb-2'>{tr('地图适应度')}</div>
            <div className='space-y-1.5'>
              {MAP_IDS.map((id) => (
                <div key={id} className='flex items-center gap-2'>
                  <span className='w-16 text-xs text-txt-muted'>{MAPS[id].name}</span>
                  <div className='flex-1'><Progress value={template.mapProficiency[id]} height='h-1.5' tone='success' /></div>
                  <span className='w-8 text-right text-xs text-txt-muted'>{template.mapProficiency[id]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {actions ? <div className='flex flex-wrap gap-2 border-t border-white/10 pt-4'>{actions}</div> : null}
      </div>
    </div>
  );
}