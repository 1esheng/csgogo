import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Coins, GraduationCap, Star } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { PACK_CONFIG, RARITY_TABLE } from '@/data/config';
import { COACH_MAP, COACH_PACK, COACH_TIER_META } from '@/data/coaches';
import { RARITIES } from '@/types';
import { Badge, Button, Panel, Progress, SectionTitle } from '@/components/ui';
import { PackReveal } from '@/features/packs/PackReveal';
import { CoachReveal } from '@/features/packs/CoachReveal';

function PriceRow({ price }: { price: number }) {
  return (
    <div className='flex items-center justify-end gap-1 font-display text-xl font-black text-accent'>
      <Coins size={15} /> {price.toLocaleString()}
    </div>
  );
}

function PackCard({
  kind, title, price, badge, desc, button, disabled, onClick,
}: {
  kind: string; title: string; price: number; badge?: string; desc: string;
  button: React.ReactNode; disabled: boolean; onClick: () => void;
}) {
  const { tr } = useT();
  return (
    <Panel className={badge ? 'flex flex-col border-accent/20' : 'flex flex-col'}>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='label-xs'>{tr(kind)}</div>
          <div className='mt-1 flex items-center gap-2'>
            <span className='font-display text-xl font-bold text-txt'>{title}</span>
            {badge ? <Badge tone='accent'>{badge}</Badge> : null}
          </div>
        </div>
        <div className='text-right'>
          <PriceRow price={price} />
          <div className='text-[10px] uppercase tracking-wider text-txt-muted'>{tr('金币')}</div>
        </div>
      </div>
      <p className='mt-3 text-xs leading-relaxed text-txt-muted'>{desc}</p>
      <Button className='mt-4 w-full' disabled={disabled} onClick={onClick}>{button}</Button>
    </Panel>
  );
}

export function PacksPage() {
  const { tr } = useT();
  const { t } = useT();
  const navigate = useNavigate();
  const club = useGameStore((s) => s.club);
  const pack = useGameStore((s) => s.pack);
  const pityOf = useGameStore((s) => s.pity);
  const openPack = useGameStore((s) => s.openPack);
  const openCoachPack = useGameStore((s) => s.openCoachPack);
  const results = useGameStore((s) => s.lastPackResults);
  const coachResults = useGameStore((s) => s.lastCoachResults);
  const clearCoachResults = useGameStore((s) => s.clearCoachResults);
  const dismissResults = useGameStore((s) => s.clearPackResults);
  const players = useGameStore((s) => s.players)();
  const coaches = useGameStore((s) => s.coaches);
  const headCoachId = useGameStore((s) => s.headCoachId);
  const pity = useMemo(() => pityOf(), [pityOf, pack]);
  const headOwned = (coaches ?? []).find((c) => c.instanceId === headCoachId);
  const headCoach = headOwned ? COACH_MAP[headOwned.coachId] : undefined;

  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h1 className='font-display text-2xl font-black tracking-tight text-txt'>{t('page.packs.title')}</h1>
          <p className='mt-0.5 text-xs text-txt-muted'>{tr('选手包与教练包是两个独立图池，概率各自计算。')}</p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge tone='accent'>金币 {club.coins.toLocaleString()}</Badge>
          <Button size='sm' variant='ghost' onClick={() => navigate('/collection')}>{tr('查看卡册')} <ArrowRight size={14} /></Button>
        </div>
      </div>

      {results && results.length > 0 ? <PackReveal results={results} players={players} skipAnimation={false} onClose={dismissResults} /> : null}
      {coachResults && coachResults.length > 0 ? <CoachReveal results={coachResults} onClose={clearCoachResults} /> : null}

      <div className='grid gap-4 lg:grid-cols-3'>
        <PackCard
          kind='单抽'
          title={tr('1 张选手卡')}
          price={PACK_CONFIG.singlePrice}
          desc={tr('按掉落表抽取一次，并结算保底计数。')}
          button='开启 1 个卡包'
          disabled={club.coins < PACK_CONFIG.singlePrice}
          onClick={() => openPack(1)}
        />
        <PackCard
          kind='十连抽'
          title={tr('10 张卡')}
          price={PACK_CONFIG.tenPrice}
          badge='-10%'
          desc={tr('保底按批次内每张卡推进。')}
          button={<><Star size={15} /> {tr('开启 10 个卡包')}</>}
          disabled={club.coins < PACK_CONFIG.tenPrice}
          onClick={() => openPack(10)}
        />
        <PackCard
          kind='百连抽'
          title={tr('100 张卡')}
          price={PACK_CONFIG.hundredPrice}
          badge='最划算'
          desc={tr('一次开满 100 张，几乎必出 UR。')}
          button={<><Star size={15} /> {tr('开启 100 个卡包')}</>}
          disabled={club.coins < PACK_CONFIG.hundredPrice}
          onClick={() => openPack(100)}
        />
      </div>

      <div className='flex flex-wrap items-end justify-between gap-2 pt-1'>
        <div>
          <h2 className='font-display text-xl font-bold tracking-wide text-txt'>{tr('教练包')}</h2>
          <p className='mt-1 text-sm text-txt-muted'>{tr('独立图池 · 64 位真实教练，按执教能力划分稀有度')}</p>
        </div>
        <Button size='sm' variant='ghost' onClick={() => navigate('/coaches')}>{tr('查看教练组')}</Button>
      </div>

      <div className='grid gap-4 lg:grid-cols-3'>
        <PackCard
          kind='教练单抽'
          title={tr('1 位教练')}
          price={COACH_PACK.single}
          desc={tr('按教练掉落表抽取一次，重复教练转为 25 点执教经验。')}
          button='签下 1 位教练'
          disabled={club.coins < COACH_PACK.single}
          onClick={() => openCoachPack(1)}
        />
        <PackCard
          kind='教练十连'
          title={tr('10 位教练')}
          price={COACH_PACK.ten}
          badge='-10%'
          desc={'十次单抽共需 ' + (COACH_PACK.single * 10).toLocaleString() + ' 金币，本批次可省 ' + (COACH_PACK.single * 10 - COACH_PACK.ten).toLocaleString() + ' 金币。'}
          button={<><Star size={15} /> {tr('签下 10 位教练')}</>}
          disabled={club.coins < COACH_PACK.ten}
          onClick={() => openCoachPack(10)}
        />
        <Panel className='flex flex-col border-accent/30'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='label-xs'>{tr('现任主教练')}</div>
              <div className='mt-1 font-display text-xl font-bold text-txt'>
                {headCoach ? headCoach.nickname : '尚未任命'}
              </div>
            </div>
            <GraduationCap size={20} className='text-txt-muted' />
          </div>
          <div className='mt-3 space-y-1 text-[11px] leading-relaxed text-txt-muted'>
            {headCoach ? (
              <>
                <div>· 国籍 {headCoach.country} · 风格 {headCoach.style}</div>
                <div>{tr('· 执教能力')} <span className='font-semibold text-txt'>{headCoach.ability}</span> · 全队 +{Math.round(headCoach.ability / 25)} 属性</div>
              </>
            ) : (
              <div>{tr('· 任命一位主教练即可获得全队属性加成')}</div>
            )}
            <div>· 已签下 {(coaches ?? []).length} 位教练</div>
          </div>
          <Button className='mt-3 w-full' variant='outline' onClick={() => navigate('/coaches')}>
            {headCoach ? '进入教练组' : '去任命主教练'}
          </Button>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title={tr('教练掉落表')} subtitle={tr('单抽基础概率，与选手包完全独立。')} right={<GraduationCap size={16} className='text-txt-muted' />} />
        <div className='space-y-2'>
          {(['S', 'A', 'B', 'C'] as const).map((tier) => {
            const meta = COACH_TIER_META[tier];
            return (
              <div key={tier} className='flex items-center gap-3 text-xs'>
                <span className='w-16 shrink-0 font-semibold' style={{ color: meta.color }}>{tr(meta.label)}</span>
                <span className='w-8 shrink-0 text-txt-muted'>{tier}</span>
                <span className='min-w-0 flex-1'><Progress value={meta.weight} max={100} height='h-1.5' tone='accent' /></span>
                <span className='w-14 shrink-0 text-right font-semibold text-txt'>{meta.weight.toFixed(2)}%</span>
              </div>
            );
          })}
        </div>
        <p className='mt-3 text-[11px] leading-relaxed text-txt-muted'>{tr('上述四档合计 100%。教练不会出现在选手卡里，选手包也不会产出教练。')}</p>
      </Panel>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <Panel>
          <SectionTitle title={tr('选手掉落表')} subtitle={tr('单抽基础概率，未计保底。')} />
          <div className='space-y-2'>
            {RARITIES.map((rarity) => {
              const meta = RARITY_TABLE[rarity];
              const pct = meta.rate * 100;
              return (
                <div key={rarity} className='flex items-center gap-3 text-xs'>
                  <span className='w-16 shrink-0 font-semibold' style={{ color: meta.color }}>{tr(meta.label)}</span>
                  <span className='w-8 shrink-0 text-txt-muted'>{rarity}</span>
                  <span className='min-w-0 flex-1'><Progress value={pct} max={100} height='h-1.5' tone='accent' /></span>
                  <span className='w-14 shrink-0 text-right font-semibold text-txt'>{pct.toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
          <p className='mt-3 text-[11px] leading-relaxed text-txt-muted'>{tr('以上合计 100%。计数达到上限时，保底会覆盖本次抽取结果。')}</p>
        </Panel>

        <div className='space-y-4'>
          <Panel>
            <SectionTitle title={tr('保底')} subtitle={tr('达到上限时，那一抽会被强制为保底品质。')} />
            <div className='space-y-3'>
              <div>
                <div className='flex items-center justify-between text-[11px] text-txt-muted'>
                  <span>{tr('SR 及以上')}</span>
                  <span className='font-semibold text-txt'>{pity.srIn} 抽</span>
                </div>
                <Progress value={pity.srProgress * 100} tone='accent' height='h-1.5' />
              </div>
              <div>
                <div className='flex items-center justify-between text-[11px] text-txt-muted'>
                  <span>{tr('SSR 及以上')}</span>
                  <span className='font-semibold text-txt'>{pity.ssrIn} 抽</span>
                </div>
                <Progress value={pity.ssrProgress * 100} tone='danger' height='h-1.5' />
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title={tr('说明')} />
            <ul className='space-y-1.5 text-[11px] leading-relaxed text-txt-muted'>
              <li>{tr('· 抽到的卡直接进入卡册，没有单独的收件箱。')}</li>
              <li>{tr('· 重复卡也会入库，三张同名卡可在「选手图鉴 → 卡牌合成」升星。')}</li>
              <li>{tr('· 教练包与选手包互不影响，主教练在「教练组」页面任命。')}</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}