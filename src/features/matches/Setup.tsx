import { useState, type ReactNode } from 'react';
import { MAP_ART } from '@/data/mapArt';
import { localizeDynamic, pick, tr } from '@/i18n';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import {
  Ban, ChevronDown, ChevronUp, Crosshair, FastForward, MapPin, Play, ShieldCheck, Star, Swords, Users,
} from 'lucide-react';
import { ROLE_LABEL, type AITeamSpec, type CardTemplate, type MapId, type PlayerIdentity } from '@/types';
import { activeTacticOptions, aiOpponents, matchMapOptions, tacticInfo, useGameStore } from '@/stores/gameStore';
import { trGameplay } from '@/i18n/areas/gameplay';
import { trUiMatch } from '@/i18n/areas/ui-match';
import { aiTeamOvr } from '@/engine/lineup';
import { MAPS } from '@/data/maps';
import { CAREER_TIERS, MATCH_CONFIG } from '@/data/config';
import { Badge, Button, Panel, Progress, Select } from '@/components/ui';
import { ECON_STYLE_LABEL } from './matchUi';

type MatchMode = 'tactical' | 'quick';

function tierName(tier: number): string {
  return CAREER_TIERS.find((t) => t.tier === tier)?.name ?? pick('第 ' + tier + ' 级', 'Tier ' + tier);
}

/** 等宽数字：标签在左、数值右对齐到固定宽度，两侧镜像时列宽仍然一致。 */
function NumField({ label, value, width }: { label: string; value: string; width: string }) {
  return (
    <span className='inline-flex items-baseline gap-1.5'>
      <span className='text-[11px] font-medium uppercase tracking-normal text-txt-muted'>{label}</span>
      <span className={clsx('text-right font-mono text-[13px] font-semibold tabular-nums text-txt', width)}>{value}</span>
    </span>
  );
}

/** 流程分节的标题：序号 + 标题 + 右侧次要信息，用顺序与权重表达「先做什么」。 */
function StepHeader({ step, title, hint }: { step: string; title: string; hint?: ReactNode }) {
  return (
    <div className='mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1'>
      <div className='flex min-w-0 items-center gap-2'>
        <span className='font-mono text-[12px] tabular-nums text-txt-muted/70'>{step}</span>
        <h2 className='truncate font-display text-[15px] font-semibold tracking-tight text-txt'>{title}</h2>
      </div>
      {hint ? <div className='shrink-0 text-[12px] text-txt-muted'>{hint}</div> : null}
    </div>
  );
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
  const missing = Math.max(0, 5 - breakdown.filled);
  const tactic = tacticInfo(tacticId) ?? tTactics[0] ?? null;
  const effectiveTacticId = tactic ? tactic.id : 'default';
  const mapDefault = store.tacticDefaults?.[mapId] ?? null;
  const mapDefaultTactic = mapDefault ? tacticInfo(mapDefault) : null;
  const templates = store.templates();
  const players = store.players();
  const myOvr = breakdown.filled > 0 ? Math.round(breakdown.ovr) : 0;
  const opponentOvr = opponent ? aiTeamOvr(opponent) : null;
  const selectedMap = MAPS[mapId];
  const blockedReason = blocked
    ? tr('填满五个阵容位置后解锁。')
    : !opponent ? tr('请先选择一个对手。') : null;

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
    <div className='space-y-3'>
      {/* 对抗摘要：谁打谁、双方实力一目了然 —— 后面每一步都在为这一行服务。 */}
      <Panel padded={false} className='px-4 py-3'>
        <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5'>
          <span className='label-xs'>{trUiMatch('对抗摘要')}</span>
          {blocked ? (
            <Link
              to='/squad'
              className='focus-ring t-colors inline-flex items-center gap-1 rounded-md border border-danger/30 bg-danger/10 px-2 py-0.5 text-[12px] font-semibold text-danger hover:border-danger/50'
            >
              <Users size={11} /> {trUiMatch('还差 ')}{missing}{trUiMatch(' 人开赛')} · {trUiMatch('去补齐阵容')}
            </Link>
          ) : (
            <span className='inline-flex items-center gap-1 text-[12px] text-txt-muted'>
              <ShieldCheck size={11} className='text-emerald-400' /> {tr('阵容齐整 · 可以开赛')}
            </span>
          )}
        </div>
        <div className='mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4'>
          <div className='min-w-0'>
            <div className='label-xs truncate'>{tr('我方')}</div>
            <div className='truncate font-display text-[17px] font-semibold leading-tight text-txt'>{store.club.name}</div>
            <div className='mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1'>
              <NumField label='OVR' value={String(myOvr)} width='min-w-[3ch]' />
              <NumField label='Elo' value={myElo !== null ? String(myElo) : tr('未定级')} width='min-w-[5ch]' />
            </div>
          </div>
          <div className='px-1 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-txt-muted'>VS</div>
          <div className='min-w-0 text-right'>
            <div className='label-xs truncate'>{tr('对手')}</div>
            <div className='truncate font-display text-[17px] font-semibold leading-tight text-txt'>
              {opponent ? opponent.name : '—'}
            </div>
            <div className='mt-1 flex flex-wrap items-baseline justify-start gap-x-3 gap-y-1'>
              <NumField label='OVR' value={opponentOvr !== null ? String(opponentOvr) : '—'} width='min-w-[3ch]' />
              <NumField label='Elo' value={opponent ? String(opponent.rating) : '—'} width='min-w-[5ch]' />
            </div>
          </div>
        </div>
      </Panel>

      {/* 01 阵容自检 */}
      <Panel padded={false} className='px-4 py-3'>
        <StepHeader
          step='01'
          title={trUiMatch('阵容自检')}
          hint={<span>{tr('已填 ')}{breakdown.filled}/5 {tr(' 个位置')}</span>}
        />
        <div className='grid grid-cols-2 gap-1.5 sm:grid-cols-5'>
          {breakdown.slots.map((slot) => (
            <div
              key={slot.slot}
              className={clsx(
                'rounded-lg border px-2 py-1.5',
                slot.instanceId ? 'border-white/[0.08] bg-white/[0.03]' : 'border-dashed border-danger/40 bg-danger/[0.06]',
              )}
            >
              <div className='flex items-baseline justify-between gap-1'>
                <span className='text-[11px] text-txt-muted'>{tr(ROLE_LABEL[slot.slot])}</span>
                {slot.instanceId ? (
                  <span className='font-mono text-[12px] font-semibold tabular-nums text-txt'>{Math.round(slot.ovr)}</span>
                ) : (
                  <span className='text-[11px] text-danger'>{tr('空缺')}</span>
                )}
              </div>
              <div className={clsx('mt-0.5 truncate text-[13px] font-semibold', slot.instanceId ? 'text-txt' : 'text-danger/70')}>
                {slot.instanceId ? slot.nickname : '—'}
              </div>
            </div>
          ))}
        </div>
        {blocked ? (
          <p className='mt-2 text-[12px] leading-snug text-danger'>
            {tr('五个战斗位置只填了 ')}{breakdown.filled}{tr(' 个。开赛需要五名不同的选手就位。')}
          </p>
        ) : null}
        {breakdown.warnings.length > 0 ? (
          <ul className='mt-2 space-y-1'>
            {breakdown.warnings.map((w) => (
              <li key={localizeDynamic(w)} className='text-[12px] leading-snug text-danger'>- {localizeDynamic(w)}</li>
            ))}
          </ul>
        ) : null}
      </Panel>

      {/* 02 选择对手 */}
      <Panel padded={false} className='px-4 py-3'>
        <StepHeader
          step='02'
          title={tr('选择对手')}
          hint={<Badge tone='muted'>{opponents.length}{tr(' 支队伍')}</Badge>}
        />
        <p className='mb-2 text-[12px] leading-snug text-txt-muted'>
          {tr('已侦查的 AI 阵容。「实力」是他们五张卡的 OVR 均值，直接和你的阵容综合比 —— Elo 只是天梯积分。')}
        </p>
        <div className='tier-scroll max-h-[46vh] space-y-3 overflow-y-auto pr-1'>
          {tiers.map((tier) => (
            <div key={tier}>
              <div className='mb-1.5 flex items-center gap-2'>
                <span className='label-xs'>{tr(tierName(tier))}</span>
                <div className='h-px flex-1 bg-white/[0.08]' />
              </div>
              <div className='grid gap-2 sm:grid-cols-2'>
                {opponents.filter((o) => o.tier === tier).map((o) => (
                  <OpponentCard
                    key={o.id}
                    spec={o}
                    selected={o.id === opponent?.id}
                    myOvr={myOvr}
                    templates={templates}
                    players={players}
                    onSelect={() => { setOpponentId(o.id); setError(null); }}
                  />
                ))}
              </div>
            </div>
          ))}
          {opponents.length === 0 ? (
            <div className='rounded-xl border border-dashed border-white/10 p-6 text-center text-[13px] text-txt-muted'>
              {tr('还没有登记任何 AI 对手。')}
            </div>
          ) : null}
        </div>
      </Panel>

      {/* 03 选择地图 */}
      <Panel padded={false} className='px-4 py-3'>
        <StepHeader
          step='03'
          title={tr('选择地图')}
          hint={<span className='font-mono tabular-nums'>{tr('熟练 ')}{Math.round(comfort[mapId] ?? 0)}%</span>}
        />
        <div className='grid gap-1.5 sm:grid-cols-2'>
          {maps.map((id) => {
            const spec = MAPS[id];
            const selected = id === mapId;
            const mapComfort = Math.round(comfort[id] ?? 0);
            return (
              <button
                key={id}
                type='button'
                onClick={() => pickMap(id)}
                aria-pressed={selected}
                className={clsx(
                  'focus-ring t-colors flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left',
                  selected ? 'border-accent/50 bg-accent/10' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20',
                )}
              >
                {MAP_ART[id] ? (
                  <img src={MAP_ART[id]} alt='' aria-hidden className='h-7 w-7 shrink-0 rounded object-contain opacity-80' />
                ) : (
                  <span aria-hidden className='h-7 w-7 shrink-0 rounded bg-white/[0.06]' />
                )}
                <span className={clsx('min-w-0 flex-1 truncate text-[13px] font-semibold', selected ? 'text-accent' : 'text-txt')}>
                  {spec.name}
                </span>
                <span className='shrink-0 font-mono text-[12px] tabular-nums text-txt-muted'>
                  <span className='inline-block min-w-[3ch] text-right text-txt'>{mapComfort}</span>%
                </span>
              </button>
            );
          })}
        </div>

        {/* 选中地图的战术示意：一张更大的图 + 两个点位 + 这张图的性格。 */}
        <div className='mt-2 rounded-xl border border-white/[0.07] bg-ink-900/40 p-3'>
          <div className='flex flex-wrap items-start gap-3'>
            {MAP_ART[mapId] ? (
              <img src={MAP_ART[mapId]} alt='' aria-hidden className='h-[104px] w-[104px] shrink-0 object-contain opacity-90' />
            ) : null}
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5'>
                <span className='font-display text-[15px] font-semibold text-txt'>{selectedMap.name}</span>
                <span className='text-[12px] text-txt-muted'>{tr(selectedMap.tagline)}</span>
              </div>
              <div className='mt-1.5 grid gap-1.5 sm:grid-cols-2'>
                {(['A', 'B'] as const).map((site) => (
                  <div key={site} className='min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5'>
                    <div className='flex min-w-0 items-center gap-1.5'>
                      <span className='grid h-4 w-4 shrink-0 place-items-center rounded bg-accent/15 font-mono text-[11px] font-semibold text-accent'>
                        {site}
                      </span>
                      <span className='min-w-0 truncate text-[12px] font-semibold text-txt'>{tr(selectedMap.sites[site].name)}</span>
                    </div>
                    <p className='mt-0.5 text-[11px] leading-snug text-txt-muted'>{tr(selectedMap.sites[site].note)}</p>
                  </div>
                ))}
              </div>
              <div className='mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-4'>
                <span className='flex items-baseline justify-between gap-2'>
                  <span className='text-txt-muted'>{trUiMatch('中路权重')}</span>
                  <span className='font-mono font-semibold tabular-nums text-txt'>{selectedMap.midValue}</span>
                </span>
                <span className='flex items-baseline justify-between gap-2'>
                  <span className='text-txt-muted'>{trUiMatch('T 加成')}</span>
                  <span className='font-mono font-semibold tabular-nums text-txt'>
                    {selectedMap.tBias > 0 ? '+' : ''}{selectedMap.tBias}
                  </span>
                </span>
                <span className='flex items-baseline justify-between gap-2'>
                  <span className='text-txt-muted'>{trUiMatch('CT 加成')}</span>
                  <span className='font-mono font-semibold tabular-nums text-txt'>+{selectedMap.ctBias}</span>
                </span>
                <span className='flex items-baseline justify-between gap-2'>
                  <span className='text-txt-muted'>{trUiMatch('狙击倍率')}</span>
                  <span className='font-mono font-semibold tabular-nums text-txt'>x{selectedMap.awpFactor.toFixed(2)}</span>
                </span>
              </div>
              <div className='mt-2'>
                <Progress value={comfort[mapId] ?? 0} max={100} tone='accent' height='h-1' label={trUiMatch('熟练度')} />
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* 04 战术预设 */}
      <Panel padded={false} className='px-4 py-3'>
        <StepHeader
          step='04'
          title={trGameplay('进攻战术预设')}
          hint={<span className='hidden max-w-[38ch] truncate sm:inline-block'>{trGameplay('换图时自动套用该图的默认战术；比赛里仍然可以随时改。')}</span>}
        />
        <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
          <span className='text-[12px] text-txt-muted'>{trUiMatch('当前：')}</span>
          <span className='font-display text-[15px] font-semibold text-accent'>{tactic ? tr(tactic.name) : '—'}</span>
        </div>
        <div className='mt-2'>
          <Select
            value={effectiveTacticId}
            onChange={(id) => { setTacticId(id); setError(null); }}
            options={tTactics.map((t) => ({ value: t.id, label: tr(t.name) }))}
          />
        </div>
        {tactic ? <p className='mt-1.5 text-[12px] leading-snug text-txt-muted'>{tr(tactic.blurb)}</p> : null}
        <div className='mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2 text-[12px]'>
          <span className='text-txt-muted'>
            {mapDefault
              ? trGameplay('该图默认：') + (mapDefaultTactic ? tr(mapDefaultTactic.name) : mapDefault)
              : trGameplay('该图还没有默认战术')}
          </span>
          <button
            type='button'
            onClick={() => store.setDefaultTactic(mapId, mapDefault === effectiveTacticId ? '' : effectiveTacticId)}
            className='focus-ring t-colors rounded text-txt-muted underline decoration-dotted underline-offset-2 hover:text-accent'
          >
            {mapDefault === effectiveTacticId ? trGameplay('取消该图默认') : trGameplay('设为该图默认')}
          </button>
        </div>
      </Panel>

      {/* 05 开赛：整页唯一的主操作，始终贴在区块底部。 */}
      <Panel padded={false} className='sticky bottom-3 z-20 px-4 py-3'>
        <div className='flex flex-wrap items-end justify-between gap-x-4 gap-y-2.5'>
          <div className='min-w-0'>
            <div className='label-xs'>{tr('比赛模式')}</div>
            <div className='mt-1 grid grid-cols-2 gap-1.5'>
              <ModeChip
                active={mode === 'tactical'}
                icon={<Swords size={13} />}
                label={tr('战术模式')}
                hint={tr('逐回合推进。每回合结束后自己决定购买、战术与进攻点位。')}
                onClick={() => setMode('tactical')}
              />
              <ModeChip
                active={mode === 'quick'}
                icon={<FastForward size={13} />}
                label={tr('快速模拟')}
                hint={tr('引擎瞬间打完一整场，直接把你丢到结算界面。')}
                onClick={() => setMode('quick')}
              />
            </div>
            <p className='mt-1 max-w-[46ch] text-[12px] leading-snug text-txt-muted'>
              {mode === 'quick'
                ? tr('引擎瞬间打完一整场，直接把你丢到结算界面。')
                : tr('逐回合推进。每回合结束后自己决定购买、战术与进攻点位。')}
            </p>
          </div>

          <div className='min-w-0 flex-1 text-[12px] leading-snug text-txt-muted'>
            <div className='truncate'>
              <span className='font-semibold text-txt'>{store.club.name}</span>
              <span className='mx-1 text-txt-muted/60'>vs</span>
              <span className='font-semibold text-txt'>{opponent ? opponent.name : '—'}</span>
              <span className='mx-1 text-txt-muted/60'>·</span>
              {selectedMap.name}
              <span className='mx-1 text-txt-muted/60'>·</span>
              {tactic ? tr(tactic.name) : '—'}
            </div>
            <div className='mt-0.5'>
              {tr('先到 ')}{MATCH_CONFIG.regulationWins}{tr(' 回合取胜，每半场 ')}{MATCH_CONFIG.halfRounds}{tr(' 回合，加时直到分出胜负。')}
            </div>
          </div>

          <div className='flex w-full shrink-0 flex-col items-stretch gap-1 sm:w-auto sm:items-end'>
            <Button size='lg' onClick={start} disabled={blocked || !opponent}>
              <Play size={16} />
              {mode === 'quick' ? tr('模拟比赛') : tr('开始比赛')}
            </Button>
            {blockedReason ? (
              <span className='text-[12px] text-txt-muted'>{blockedReason}</span>
            ) : (
              <span className='text-[12px] text-txt-muted'>{trUiMatch('对手与地图已锁定，随时可以开打。')}</span>
            )}
          </div>
        </div>
        {error ? (
          <div className='mt-2.5 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[12px] text-danger'>
            <Ban size={14} className='mt-0.5 shrink-0' />
            <span>{error}</span>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function OpponentCard({
  spec, selected, myOvr, templates, players, onSelect,
}: {
  spec: AITeamSpec;
  selected: boolean;
  myOvr: number;
  templates: Record<string, CardTemplate>;
  players: Record<string, PlayerIdentity>;
  onSelect: () => void;
}) {
  // 用阵容真实实力（卡片 OVR 均值）对比，而不是天梯 Elo —— 两者以前对不上，会误导难度判断。
  const [open, setOpen] = useState(false);
  const teamOvr = aiTeamOvr(spec);
  const delta = myOvr > 0 ? teamOvr - myOvr : null;
  const openingTactic = spec.tTactics[0] ? tacticInfo(spec.tTactics[0]) : null;
  return (
    <div
      className={clsx(
        't-colors rounded-xl border',
        selected ? 'border-accent/50 bg-ink-700' : 'border-white/[0.07] bg-white/[0.02]',
      )}
    >
      <button
        type='button'
        onClick={onSelect}
        aria-pressed={selected}
        className={clsx(
          'focus-ring t-colors w-full rounded-xl px-3 py-2 text-left',
          selected ? '' : 'hover:bg-white/[0.03]',
        )}
      >
        <div className='flex items-center justify-between gap-2'>
          <span className='flex min-w-0 items-center gap-1.5'>
            {selected ? <span aria-hidden className='h-1.5 w-1.5 shrink-0 rounded-full bg-accent' /> : null}
            <span className={clsx('truncate font-display text-[15px] font-semibold', selected ? 'text-txt' : 'text-txt/90')}>
              {spec.name}
            </span>
          </span>
          <span className='shrink-0 font-mono text-[11px] tabular-nums text-txt-muted'>{spec.shortName}</span>
        </div>
        <div className='mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px] text-txt-muted'>
          <span className='inline-flex items-baseline gap-1'>
            <span>{tr('实力 ')}</span>
            <span className='min-w-[3ch] text-right font-mono font-semibold tabular-nums text-txt'>{teamOvr}</span>
          </span>
          {delta !== null ? (
            <span className={clsx('font-mono font-semibold tabular-nums', delta > 0 ? 'text-danger' : 'text-emerald-300')}>
              {tr('较你 ')}{delta > 0 ? '+' : ''}{delta}
            </span>
          ) : null}
          <span className='font-mono tabular-nums'>Elo {spec.rating}</span>
          <span className='rounded bg-white/5 px-1.5 py-0.5'>{tr(ECON_STYLE_LABEL[spec.econStyle])}</span>
        </div>
      </button>

      {/* 次级内容：只跟着选中的那一张走，默认折叠，不抢主线的注意力。 */}
      {selected ? (
        <div className='px-3 pb-2'>
          <button
            type='button'
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className='focus-ring t-colors inline-flex items-center gap-1 rounded text-[12px] text-txt-muted hover:text-accent'
          >
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {open ? trUiMatch('收起详情') : trUiMatch('侦查详情')}
          </button>
          {open ? (
            <div className='motion-fade mt-1.5 space-y-1.5 border-t border-white/[0.06] pt-1.5'>
              <p className='text-[12px] leading-snug text-txt-muted'>{pick(spec.blurb, spec.blurbEn ?? spec.blurb)}</p>
              <div className='flex flex-wrap gap-1 text-[11px] text-txt-muted'>
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
              <ul className='space-y-0.5'>
                {spec.lineup.map((slot) => (
                  <li key={slot.templateId} className='flex items-center justify-between gap-2 text-[12px]'>
                    <span className='flex min-w-0 items-center gap-1'>
                      {slot.isIGL ? <Star size={9} className='shrink-0 text-accent' /> : null}
                      <span className='truncate text-txt'>
                        {players[templates[slot.templateId]?.playerId ?? '']?.nickname ?? slot.templateId}
                      </span>
                    </span>
                    <span className='shrink-0 text-[11px] text-txt-muted'>{tr(ROLE_LABEL[slot.role])}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ModeChip({
  active, icon, label, hint, onClick,
}: { active: boolean; icon: ReactNode; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={clsx(
        'focus-ring t-colors inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold',
        active
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-white/[0.08] text-txt-muted hover:border-white/20 hover:text-txt',
      )}
    >
      <span className='shrink-0'>{icon}</span>
      <span className='truncate'>{label}</span>
    </button>
  );
}
