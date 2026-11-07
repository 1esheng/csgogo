import { useState } from 'react';
import { MAP_ART } from '@/data/mapArt';
import { localizeDynamic, pick, tr } from '@/i18n';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Ban, Crosshair, FastForward, MapPin, Play, ShieldCheck, Swords, Users } from 'lucide-react';
import { ROLE_LABEL, type AITeamSpec, type MapId } from '@/types';
import { activeTacticOptions, aiOpponents, matchMapOptions, tacticInfo, useGameStore } from '@/stores/gameStore';
import { trGameplay } from '@/i18n/areas/gameplay';
import { aiTeamOvr } from '@/engine/lineup';
import { MAPS } from '@/data/maps';
import { CAREER_TIERS, MATCH_CONFIG } from '@/data/config';
import { Badge, Button, Panel, Progress, SectionTitle, Select } from '@/components/ui';
import { ECON_STYLE_LABEL } from './matchUi';

type MatchMode = 'tactical' | 'quick';

function tierName(tier: number): string {
  return CAREER_TIERS.find((t) => t.tier === tier)?.name ?? pick('第 ' + tier + ' 级', 'Tier ' + tier);
}

export function Setup() {
  const { tr } = useT();
  const store = useGameStore();
  const opponents = aiOpponents();
  const maps = matchMapOptions();
  const tTactics = activeTacticOptions('T');
  const [opponentId, setOpponentId] = useState<string>(() => opponents[0]?.id ?? '');
  const [mapId, setMapId] = useState<MapId>(() => maps[0] ?? 'Mirage');
  // 战术预设：默认取该图的默认战术，没有默认就沿用引擎默认执行。
  const [tacticId, setTacticId] = useState<string>(
    () => store.tacticDefaults?.[maps[0] ?? 'Mirage'] ?? tTactics[0]?.id ?? 'default',
  );
  const [mode, setMode] = useState<MatchMode>('tactical');
  const [error, setError] = useState<string | null>(null);

  const breakdown = store.squadRating(mapId);
  const myElo = store.leaders.find((l) => l.id === 'player')?.rating ?? null;
  const comfort = maps.reduce<Record<string, number>>((acc, id) => {
    acc[id] = store.squadRating(id).averageMapComfort;
    return acc;
  }, {});
  const opponent = opponents.find((o) => o.id === opponentId) ?? opponents[0] ?? null;
  const blocked = breakdown.filled < 5;
  const tactic = tacticInfo(tacticId) ?? tTactics[0] ?? null;
  const effectiveTacticId = tactic ? tactic.id : 'default';
  const mapDefault = store.tacticDefaults?.[mapId] ?? null;
  const mapDefaultTactic = mapDefault ? tacticInfo(mapDefault) : null;

  const pickMap = (id: MapId) => {
    setMapId(id);
    setError(null);
    // 切换地图时套用该图默认战术；没有默认就保持当前选择。
    const next = store.tacticDefaults?.[id];
    if (next) setTacticId(next);
  };
  const tiers = [...new Set(opponents.map((o) => o.tier))].sort((a, b) => a - b);

  const start = () => {
    setError(null);
    if (!opponent) {
      setError(tr('请先选择一个对手。'));
      return;
    }
    const result = store.startMatch({ mapId, opponentId: opponent.id, mode, tactic: effectiveTacticId });
    if (!result.ok) {
      setError(result.error ?? tr('这场比赛无法开始。'));
      return;
    }
    if (mode === 'quick') useGameStore.getState().autoPlay();
  };

  return (
    <div className='space-y-4'>
      <Panel className='grid-noise'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <div className='label-xs'>{tr('我方首发')}</div>
            <div className='mt-1 font-display text-xl font-semibold text-txt'>{store.club.name}</div>
            <div className='mt-1 flex flex-wrap items-center gap-2 text-[13px] text-txt-muted'>
              <span>OVR {breakdown.filled > 0 ? Math.round(breakdown.ovr) : 0}</span>
              <span className='text-white/20'>|</span>
              <span>Elo {myElo !== null ? myElo : tr('未定级')}</span>
              <span className='text-white/20'>|</span>
              <span>{tr('已填 ')}{breakdown.filled}/5 {tr(' 个位置')}</span>
            </div>
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {breakdown.slots.map((slot) => (
              <div
                key={slot.slot}
                className={clsx(
                  'rounded-lg border px-2 py-1 text-[12px]',
                  slot.instanceId ? 'border-white/10 bg-ink-700/60 text-txt' : 'border-dashed border-danger/40 bg-danger/5 text-danger',
                )}
              >
                <span className='text-[11px] text-txt-muted'>{tr(ROLE_LABEL[slot.slot])}</span>
                <div className='font-semibold'>{slot.instanceId ? slot.nickname + ' ' + Math.round(slot.ovr) : tr('空缺')}</div>
              </div>
            ))}
          </div>
        </div>
        {breakdown.warnings.length > 0 ? (
          <ul className='mt-3 space-y-1'>
            {breakdown.warnings.map((w) => (
              <li key={localizeDynamic(w)} className='text-[13px] text-danger'>- {localizeDynamic(w)}</li>
            ))}
          </ul>
        ) : null}
      </Panel>

      {blocked ? (
        <Panel className='border-danger/40 bg-danger/5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-start gap-3'>
              <Ban size={18} className='mt-0.5 shrink-0 text-danger' />
              <div>
                <div className='font-display text-base font-semibold text-txt'>{tr('阵容还没凑齐')}</div>
                <p className='mt-1 text-[15px] text-txt-muted'>
                  {tr('五个战斗位置只填了 ')}{breakdown.filled}{tr(' 个。开赛需要五名不同的选手就位。')}
                </p>
              </div>
            </div>
            <Link to='/squad'>
              <Button variant='primary' size='sm'>{tr('打开阵容编辑器')}</Button>
            </Link>
          </div>
        </Panel>
      ) : null}

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <Panel>
          <SectionTitle
            title={tr('选择对手')}
            subtitle={tr('已侦查的 AI 阵容。「实力」是他们五张卡的 OVR 均值，直接和你的阵容综合比 —— Elo 只是天梯积分。')}
            right={<Badge tone='muted'>{opponents.length}{tr(' 支队伍')}</Badge>}
          />
          <div className='max-h-[52vh] space-y-4 overflow-auto pr-1'>
            {tiers.map((tier) => (
              <div key={tier}>
                <div className='mb-2 flex items-center gap-2'>
                  <span className='label-xs'>{tr(tierName(tier))}</span>
                  <div className='h-px flex-1 bg-white/8' />
                </div>
                <div className='grid gap-2 sm:grid-cols-2'>
                  {opponents.filter((o) => o.tier === tier).map((o) => (
                    <OpponentCard
                      key={o.id}
                      spec={o}
                      selected={o.id === opponent?.id}
                      myOvr={Math.round(breakdown.ovr)}
                      onSelect={() => { setOpponentId(o.id); setError(null); }}
                    />
                  ))}
                </div>
              </div>
            ))}
            {opponents.length === 0 ? (
              <div className='rounded-xl border border-dashed border-white/10 p-6 text-center text-[15px] text-txt-muted'>
                {tr('还没有登记任何 AI 对手。')}
              </div>
            ) : null}
          </div>
        </Panel>

        <div className='space-y-4'>
          <Panel>
            <SectionTitle title={tr('选择地图')} subtitle={tr('地图熟练度来自每名选手对该图的掌握程度。')} />
            <div className='space-y-2'>
              {maps.map((id) => {
                const spec = MAPS[id];
                const selected = id === mapId;
                const mapComfort = Math.round(comfort[id] ?? 0);
                return (
                  <button
                    key={id}
                    onClick={() => pickMap(id)}
                    className={clsx(
                      'focus-ring w-full rounded-xl border px-3 py-2 text-left t-colors',
                      selected ? 'border-accent/60 bg-accent/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25',
                    )}
                  >
                    {MAP_ART[id] ? (<img src={MAP_ART[id]} alt='' aria-hidden className='mx-auto mb-2 h-[120px] w-[120px] object-contain opacity-90' />) : null}
                    <div className='flex items-center justify-between gap-2'>
                      <span className='font-display text-[15px] font-semibold text-txt'>{spec.name}</span>
                      <span className={clsx('text-[12px]', selected ? 'text-accent' : 'text-txt-muted')}>{tr('熟练 ')}{mapComfort}</span>
                    </div>
                    <p className='mt-0.5 text-[12px] leading-snug text-txt-muted'>{tr(spec.tagline)}</p>
                    <div className='mt-1.5'>
                      <Progress value={mapComfort} max={100} tone='accent' height='h-1' />
                    </div>
                    <div className='mt-1.5 flex flex-wrap gap-1 text-[12px] text-txt-muted'>
                      <span className='rounded bg-white/5 px-1.5 py-0.5'>{tr('中期 ')}{spec.midValue}</span>
                      <span className='rounded bg-white/5 px-1.5 py-0.5'>AWP x{spec.awpFactor.toFixed(2)}</span>
                      <span className='rounded bg-white/5 px-1.5 py-0.5'>T {spec.tBias > 0 ? '+' : ''}{spec.tBias}</span>
                      <span className='rounded bg-white/5 px-1.5 py-0.5'>CT +{spec.ctBias}</span>
                    </div>
                    <div className='mt-1 text-[12px] leading-snug text-txt-muted'>
                      A: {tr(spec.sites.A.name)} · B: {tr(spec.sites.B.name)}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              title={trGameplay('进攻战术预设')}
              subtitle={trGameplay('换图时自动套用该图的默认战术；比赛里仍然可以随时改。')}
              right={<Crosshair size={15} className='text-txt-muted' />}
            />
            <Select
              value={effectiveTacticId}
              onChange={(id) => { setTacticId(id); setError(null); }}
              options={tTactics.map((t) => ({ value: t.id, label: tr(t.name) }))}
            />
            {tactic ? <p className='mt-1.5 text-[12px] leading-snug text-txt-muted'>{tr(tactic.blurb)}</p> : null}
            <div className='mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px]'>
              <span className='text-txt-muted'>
                {mapDefault
                  ? trGameplay('该图默认：') + (mapDefaultTactic ? tr(mapDefaultTactic.name) : mapDefault)
                  : trGameplay('该图还没有默认战术')}
              </span>
              <button
                type='button'
                onClick={() => store.setDefaultTactic(mapId, mapDefault === effectiveTacticId ? '' : effectiveTacticId)}
                className='focus-ring rounded text-txt-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-accent'
              >
                {mapDefault === effectiveTacticId ? trGameplay('取消该图默认') : trGameplay('设为该图默认')}
              </button>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title={tr('比赛模式')} subtitle={tr('先到 ') + MATCH_CONFIG.regulationWins + tr(' 回合取胜，每半场 ') + MATCH_CONFIG.halfRounds + tr(' 回合，加时直到分出胜负。')} />
            <div className='grid gap-2'>
              <ModeCard
                active={mode === 'tactical'}
                icon={<Swords size={16} />}
                title={tr('战术模式')}
                detail={tr('逐回合推进。每回合结束后自己决定购买、战术与进攻点位。')}
                onClick={() => setMode('tactical')}
              />
              <ModeCard
                active={mode === 'quick'}
                icon={<FastForward size={16} />}
                title={tr('快速模拟')}
                detail={tr('引擎瞬间打完一整场，直接把你丢到结算界面。')}
                onClick={() => setMode('quick')}
              />
            </div>
            {opponent ? (
              <div className='mt-3 rounded-xl border border-white/5 bg-ink-900/60 px-3 py-2 text-[12px] text-txt-muted'>
                <div className='flex items-center justify-between'>
                  <span>{tr('我方')}</span>
                  <span className='font-semibold text-txt'>{store.club.name}</span>
                </div>
                <div className='mt-1 flex items-center justify-between'>
                  <span>{tr('对手')}</span>
                  <span className='font-semibold text-txt'>{opponent.name}</span>
                </div>
                <div className='mt-1 flex items-center justify-between'>
                  <span>{tr('地图')}</span>
                  <span className='font-semibold text-txt'>{MAPS[mapId].name}</span>
                </div>
              </div>
            ) : null}
            {error ? (
              <div className='mt-3 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger'>
                <Ban size={14} className='mt-0.5 shrink-0' />
                <span>{error}</span>
              </div>
            ) : null}
            <Button className='mt-3 w-full' size='lg' onClick={start} disabled={blocked || !opponent}>
              <Play size={16} />
              {mode === 'quick' ? tr('模拟比赛') : tr('开始比赛')}
            </Button>
            {blocked ? <p className='mt-2 text-center text-[12px] text-txt-muted'>{tr('填满五个阵容位置后解锁。')}</p> : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function OpponentCard({
  spec, selected, myOvr, onSelect,
}: { spec: AITeamSpec; selected: boolean; myOvr: number; onSelect: () => void }) {
  // 用阵容真实实力（卡片 OVR 均值）对比，而不是天梯 Elo —— 两者以前对不上，会误导难度判断。
  const teamOvr = aiTeamOvr(spec);
  const delta = myOvr > 0 ? teamOvr - myOvr : null;
  const openingTactic = spec.tTactics[0] ? tacticInfo(spec.tTactics[0]) : null;
  return (
    <button
      onClick={onSelect}
      className={clsx(
        'focus-ring rounded-xl border px-3 py-2 text-left t-colors',
        selected ? 'border-accent/60 bg-accent/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25',
      )}
    >
      <div className='flex items-center justify-between gap-2'>
        <span className='truncate font-display text-[15px] font-semibold text-txt'>{spec.name}</span>
        <Badge tone={selected ? 'accent' : 'muted'}>{spec.shortName}</Badge>
      </div>
      <div className='mt-1 flex flex-wrap items-center gap-2 text-[12px] text-txt-muted'>
        <span className='inline-flex items-center gap-1 font-semibold text-txt'>
          <ShieldCheck size={11} className='text-txt-muted' /> {tr('实力 ')}{teamOvr}
        </span>
        {delta !== null ? (
          <span className={clsx('font-semibold', delta > 0 ? 'text-danger' : 'text-emerald-300')}>
            {tr('较你 ')}{delta > 0 ? '+' : ''}{delta}
          </span>
        ) : null}
        <span className='rounded bg-white/5 px-1.5 py-0.5 text-[12px] text-txt-muted'>Elo {spec.rating}</span>
        <span className='rounded bg-white/5 px-1.5 py-0.5'>{tr(ECON_STYLE_LABEL[spec.econStyle])}</span>
      </div>
      <p className='mt-1 text-[12px] leading-snug text-txt-muted'>{pick(spec.blurb, spec.blurbEn ?? spec.blurb)}</p>
      <div className='mt-1 flex flex-wrap items-center gap-1 text-[12px] text-txt-muted'>
        <span className='inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5'>
          <MapPin size={9} /> {spec.mapPref.map((m) => MAPS[m]?.name ?? m).join(' / ')}
        </span>
        {openingTactic ? (
          <span className='inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5'>
            <Crosshair size={9} /> {tr(openingTactic.name)}
          </span>
        ) : null}
        <span className='inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5'>
          <Users size={9} /> {spec.lineup.length}
        </span>
      </div>
    </button>
  );
}

function ModeCard({
  active, icon, title, detail, onClick,
}: { active: boolean; icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'focus-ring flex items-start gap-3 rounded-xl border px-3 py-2 text-left t-colors',
        active ? 'border-accent/60 bg-accent/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25',
      )}
    >
      <span className={clsx('mt-0.5', active ? 'text-accent' : 'text-txt-muted')}>{icon}</span>
      <span className='min-w-0'>
        <span className='block font-display text-[15px] font-semibold text-txt'>{title}</span>
        <span className='mt-0.5 block text-[12px] leading-snug text-txt-muted'>{detail}</span>
      </span>
    </button>
  );
}