import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { CalendarDays, MapPin, Swords, TrendingUp, Trophy, Users } from 'lucide-react';
import { useGameStore, aiOpponents } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { MAPS } from '@/data/maps';
import { COACH_MAP } from '@/data/coaches';
import { coachEffects } from '@/engine/coach';
import { CAREER_TIERS, RARITY_TABLE } from '@/data/config';
import { COMBAT_ROLES } from '@/types';
import type { CombatRole } from '@/types';
import { cardOVR, effectiveAttributes } from '@/engine/rating';
import { Badge, Button, Panel, SectionTitle } from '@/components/ui';
import { Avatar } from '@/components/Avatar';

const ROLE_SHORT: Record<CombatRole, string> = {
  AWPer: '狙击手', Entry: '突破手', Lurker: '自由人', Support: '辅助', Anchor: '主防',
};

export function DashboardPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const club = useGameStore((s) => s.club);
  const cards = useGameStore((s) => s.cards);
  const squad = useGameStore((s) => s.squad);
  const squadRating = useGameStore((s) => s.squadRating);
  const templates = useGameStore((s) => s.templates)();
  const players = useGameStore((s) => s.players)();
  const matches = useGameStore((s) => s.matches);
  const leaders = useGameStore((s) => s.leaders);
  const autoFillSquad = useGameStore((s) => s.autoFillSquad);
  const coaches = useGameStore((s) => s.coaches);
  const headCoachId = useGameStore((s) => s.headCoachId);
  const headOwned = (coaches ?? []).find((c) => c.instanceId === headCoachId);
  const headInfo = headOwned ? COACH_MAP[headOwned.coachId] : undefined;
  const headEffects = coachEffects(headInfo ?? null);
  const careerHonors = useGameStore((s) => s.career.honors ?? []);
  const careerTitles = useGameStore((s) => s.career.titles);
  const majors = careerHonors.filter((h) => h.tier === 9).length;
  const recentHonors = [...careerHonors].sort((a, b) => b.wonAt - a.wonAt).slice(0, 4);
  const [filter, setFilter] = useState<'all' | CombatRole>('all');

  const mapId = 'Mirage' as const;
  const breakdown = useMemo(() => squadRating(mapId), [squadRating, squad, mapId]);
  const rating = leaders.find((l) => l.id === 'player')?.rating ?? 1000;
  const opponents = useMemo(() => aiOpponents(), []);
  const nextOpponent = useMemo(
    () => [...opponents].sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating))[0] ?? opponents[0],
    [opponents, rating],
  );

  const starters = COMBAT_ROLES.map((role) => {
    const id = squad.slots[role];
    const card = id ? cards.find((c) => c.instanceId === id) : undefined;
    const tpl = card ? templates[card.templateId] : undefined;
    return { role, card, tpl };
  });
  const owned = useMemo(
    () => [...cards]
      .map((c) => ({ card: c, tpl: templates[c.templateId] }))
      .filter((x) => x.tpl)
      .sort((a, b) => cardOVR(b.tpl!, b.card.level, b.card.stars ?? 1) - cardOVR(a.tpl!, a.card.level, a.card.stars ?? 1)),
    [cards, templates],
  );
  const filteredOwned = filter === 'all'
    ? owned
    : owned.filter((x) => x.tpl!.primaryRole === filter || x.tpl!.secondaryRole === filter);
  const recent = matches.slice(0, 5);
  const total = club.wins + club.losses;
  const winRate = total > 0 ? Math.round((club.wins / total) * 100) : 0;
  const form = matches.slice(0, 8).reverse();
  const bars = [
    { key: 'aim' as const, label: '枪法' },
    { key: 'reflex' as const, label: '反应' },
    { key: 'gameSense' as const, label: '意识' },
    { key: 'clutch' as const, label: '残局' },
  ];

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h1 className='font-display text-2xl font-black tracking-tight text-txt'>{t('page.dashboard.title')}</h1>
          <p className='mt-0.5 text-xs text-txt-muted'>第 {club.season} 赛季 · 巡回赛积分 {rating} · 阵容战力 {breakdown.ovr}</p>
        </div>
        <div className='flex items-center gap-2'>
          {breakdown.filled < 5 ? (
            <Button size='sm' variant='outline' onClick={() => autoFillSquad()}>
              一键自动填充阵容
            </Button>
          ) : null}
          <Badge tone={breakdown.filled === 5 ? 'success' : 'danger'}>
          {breakdown.filled === 5 ? '阵容齐整 · 可以开赛' : '还差 ' + (5 - breakdown.filled) + ' 人才能开赛'}
          </Badge>
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='space-y-4'>
          <Panel>
            <SectionTitle
              title={t('page.dashboard.starters')}
              subtitle={'当前地图 ' + MAPS[mapId].name + ' · 团队默契 ' + Math.round(breakdown.chemistry) + '%'}
              right={<Button size='sm' variant='outline' onClick={() => navigate('/squad')}>调整阵容</Button>}
            />
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
              {starters.map(({ role, card, tpl }) => {
                if (!card || !tpl) {
                  return (
                    <button
                      key={role}
                      type='button'
                      onClick={() => navigate('/squad')}
                      className='flex h-[230px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-center'
                    >
                      <Users size={20} className='text-txt-muted' />
                      <span className='text-xs font-semibold text-txt-muted'>{ROLE_SHORT[role]}</span>
                      <span className='text-[11px] text-txt-muted/70'>空缺 · 点击指派</span>
                    </button>
                  );
                }
                const rarity = RARITY_TABLE[tpl.rarity];
                const attrs = effectiveAttributes(tpl, card.level, card.stars ?? 1);
                const ovr = cardOVR(tpl, card.level, card.stars ?? 1);
                const identity = players[tpl.playerId];
                return (
                  <button
                    key={role}
                    type='button'
                    onClick={() => navigate('/squad')}
                    className='overflow-hidden rounded-2xl border p-3 text-left transition hover:brightness-110'
                    style={{ borderColor: rarity.color + '55', background: 'linear-gradient(165deg,' + rarity.color + '22, rgba(17,21,28,0.95))' }}
                  >
                    <div className='flex items-start justify-between'>
                      <div>
                        <div className='font-display text-2xl font-black leading-none' style={{ color: rarity.color }}>{ovr}</div>
                        <div className='text-[10px] uppercase tracking-wider text-txt-muted'>综合</div>
                      </div>
                      {(card.stars ?? 1) > 1 ? (
                        <span className='rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent'>{card.stars}★</span>
                      ) : null}
                    </div>
                    <div className='mt-2 flex justify-center'>
                      <Avatar nickname={identity?.nickname ?? tpl.playerId} playerId={tpl.playerId} size={64} />
                    </div>
                    <div className='mt-2 truncate font-display text-sm font-bold text-txt'>{identity?.nickname ?? tpl.playerId}</div>
                    <div className='text-[10px] uppercase tracking-wider text-txt-muted'>{ROLE_SHORT[role]} · {card.level} 级</div>
                    <div className='mt-2 space-y-1'>
                      {bars.map((bar) => (
                        <div key={bar.key} className='flex items-center gap-1.5'>
                          <span className='w-6 shrink-0 text-[9px] text-txt-muted'>{bar.label}</span>
                          <span className='h-1 flex-1 overflow-hidden rounded-full bg-white/10'>
                            <span className='block h-full rounded-full' style={{ width: Math.min(100, attrs[bar.key] / 1.2) + '%', background: rarity.color }} />
                          </span>
                          <span className='w-5 shrink-0 text-right text-[9px] font-semibold text-txt'>{attrs[bar.key]}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              title={t('page.dashboard.coach')}
              subtitle={headInfo ? headInfo.style + '型 · 执教能力 ' + headInfo.ability : '尚未任命主教练'}
              right={<Button size='sm' variant='outline' onClick={() => navigate('/coaches')}>{headInfo ? '进入教练组' : '去任命'}</Button>}
            />
            {headInfo ? (
              <div className='flex flex-wrap items-center gap-3'>
                <span className='grid h-11 w-11 place-items-center rounded-xl bg-accent/15 font-display text-xs font-black text-accent'>
                  {headInfo.nickname.slice(0, 2).toUpperCase()}
                </span>
                <div className='min-w-0'>
                  <div className='font-display text-sm font-bold text-txt'>{headInfo.nickname}</div>
                  <div className='text-[11px] text-txt-muted'>{headInfo.country} · {headInfo.style}</div>
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  <Badge tone='accent'>全队属性 +{headEffects.attributeBonus}</Badge>
                  {headEffects.trainingXpPct > 0 ? <Badge tone='success'>训练经验 +{Math.round(headEffects.trainingXpPct * 100)}%</Badge> : null}
                  {headEffects.opponentAdaptivityCut > 0 ? <Badge tone='muted'>对手适应力 -{Math.round(headEffects.opponentAdaptivityCut * 100)}%</Badge> : null}
                  {headEffects.economyBonus > 0 ? <Badge tone='muted'>开局每人 +{headEffects.economyBonus} 金币</Badge> : null}
                </div>
              </div>
            ) : (
              <p className='text-xs text-txt-muted'>任命一位主教练可以获得属性加成、训练提速或开局经济优势。</p>
            )}
          </Panel>

          <Panel>
            <SectionTitle
              title={t('page.dashboard.honors')}
              subtitle={'夺冠 ' + careerTitles + ' 次 · MAJOR 冠军 ' + majors + ' 次'}
              right={<Button size='sm' variant='outline' onClick={() => navigate('/team/player')}>奖杯墙</Button>}
            />
            {recentHonors.length === 0 ? (
              <p className='text-xs text-txt-muted'>还没有奖杯——打进生涯联赛夺冠后会记录在这里。</p>
            ) : (
              <div className='grid gap-2 sm:grid-cols-2'>
                {recentHonors.map((h) => (
                  <div
                    key={h.id}
                    className={h.tier === 9 ? 'flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/[0.07] px-3 py-2' : 'flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2'}
                  >
                    <Trophy size={15} className={h.tier === 9 ? 'text-accent' : 'text-txt-muted'} />
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-xs font-semibold text-txt'>{h.name}</div>
                      <div className='text-[11px] text-txt-muted'>{CAREER_TIERS[h.tier]?.name ?? '赛事'} · {h.prize.toLocaleString()} 金币</div>
                    </div>
                    {h.tier === 9 ? <Badge tone='accent'>MAJOR</Badge> : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionTitle
              title={t('page.dashboard.preview')}
              subtitle={'已拥有 ' + owned.length + ' 张卡 · 按综合评分排序'}
              right={<Button size='sm' variant='ghost' onClick={() => navigate('/collection')}>查看全部</Button>}
            />
            <div className='mb-3 flex flex-wrap gap-1.5'>
              {(['all', ...COMBAT_ROLES] as const).map((key) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => setFilter(key as 'all' | CombatRole)}
                  className={clsx(
                    'rounded-full px-3 py-1 text-[11px] font-semibold transition',
                    filter === key ? 'bg-accent text-ink-950' : 'bg-white/5 text-txt-muted hover:bg-white/10',
                  )}
                >
                  {key === 'all' ? '全部' : ROLE_SHORT[key as CombatRole]}
                </button>
              ))}
            </div>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5'>
              {filteredOwned.slice(0, 5).map(({ card, tpl }) => {
                const rarity = RARITY_TABLE[tpl!.rarity];
                const identity = players[tpl!.playerId];
                return (
                  <button
                    key={card.instanceId}
                    type='button'
                    onClick={() => navigate('/collection')}
                    className='rounded-xl border p-2 text-left transition hover:brightness-110'
                    style={{ borderColor: rarity.color + '44', background: rarity.color + '12' }}
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-display text-lg font-black' style={{ color: rarity.color }}>{cardOVR(tpl!, card.level, card.stars ?? 1)}</span>
                      <span className='text-[9px] uppercase tracking-wider text-txt-muted'>{rarity.label}</span>
                    </div>
                    <div className='mt-1 truncate text-xs font-semibold text-txt'>{identity?.nickname ?? tpl!.playerId}</div>
                    <div className='text-[10px] text-txt-muted'>{ROLE_SHORT[tpl!.primaryRole as CombatRole] ?? '选手'}</div>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className='space-y-4'>
          <Panel className='relative overflow-hidden'>
            <div className='pointer-events-none absolute inset-0 grid-noise opacity-60' />
            <div className='relative'>
              <SectionTitle
                title={t('page.dashboard.matchCenter')}
                subtitle='下一场对手按你的积分匹配'
                right={<Badge tone='accent'>准备就绪</Badge>}
              />
              <div className='rounded-xl border border-white/10 bg-black/25 p-3'>
                <div className='flex items-center justify-between text-xs text-txt-muted'>
                  <span>{MAPS[mapId].name}</span>
                  <span className='inline-flex items-center gap-1'><CalendarDays size={11} /> 第 {club.season} 赛季</span>
                </div>
                <div className='mt-2 flex items-center justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='truncate font-display text-base font-bold text-txt'>{club.name}</div>
                    <div className='text-[11px] text-txt-muted'>战力 {breakdown.ovr}</div>
                  </div>
                  <div className='font-display text-xl font-black text-txt-muted'>VS</div>
                  <div className='min-w-0 text-right'>
                    <div className='truncate font-display text-base font-bold text-txt'>{nextOpponent?.name ?? '待定'}</div>
                    <div className='text-[11px] text-txt-muted'>评分 {nextOpponent?.rating ?? '—'}</div>
                  </div>
                </div>
                <div className='mt-2 flex items-center gap-1 text-[11px] text-txt-muted'>
                  <MapPin size={11} /> {nextOpponent ? '第 ' + (nextOpponent.tier + 1) + ' 档战队' : '—'}
                </div>
              </div>
              <div className='mt-3 grid gap-2'>
                <Button onClick={() => navigate('/career')}>
                  <Trophy size={15} /> 去生涯打联赛
                </Button>
                <Button variant='outline' onClick={() => navigate('/match')}>
                  <Swords size={15} /> 安排训练赛
                </Button>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title={t('page.dashboard.recent')} subtitle={'总战绩 ' + club.wins + ' 胜 ' + club.losses + ' 负 · 胜率 ' + winRate + '%'} />
            {recent.length === 0 ? (
              <p className='text-xs text-txt-muted'>还没有比赛记录——去生涯打第一场吧。</p>
            ) : (
              <ul className='space-y-1.5'>
                {recent.map((m) => (
                  <li key={m.id} className='flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-xs'>
                    <span className={clsx('w-1.5 self-stretch rounded-full', m.won ? 'bg-emerald-400' : 'bg-danger')} />
                    <span className='min-w-0 flex-1 truncate text-txt'>对阵 {m.opponentName}</span>
                    <span className={clsx('font-display font-bold', m.won ? 'text-emerald-400' : 'text-danger')}>{m.scoreFor}-{m.scoreAgainst}</span>
                    <Badge tone={m.won ? 'success' : 'danger'}>{m.won ? '胜' : '负'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <SectionTitle title={t('page.dashboard.form')} subtitle='最近 8 场的比分' right={<TrendingUp size={16} className='text-txt-muted' />} />
            {form.length === 0 ? (
              <p className='text-xs text-txt-muted'>打几场之后这里会显示走势。</p>
            ) : (
              <div className='flex h-24 items-end gap-1.5'>
                {form.map((m) => (
                  <div key={m.id} className='flex flex-1 flex-col items-center gap-1'>
                    <div className={clsx('w-full rounded-t', m.won ? 'bg-emerald-400/70' : 'bg-danger/70')} style={{ height: Math.max(8, m.scoreFor * 5) + 'px' }} />
                    <span className='text-[9px] text-txt-muted'>{m.scoreFor}</span>
                  </div>
                ))}
              </div>
            )}
            <div className='mt-3 grid grid-cols-2 gap-2 text-[11px] text-txt-muted'>
              <div className='rounded-lg bg-white/[0.03] px-2 py-1.5'>进攻 <span className='font-display text-sm font-bold text-txt'>{breakdown.attack}</span></div>
              <div className='rounded-lg bg-white/[0.03] px-2 py-1.5'>防守 <span className='font-display text-sm font-bold text-txt'>{breakdown.defense}</span></div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}