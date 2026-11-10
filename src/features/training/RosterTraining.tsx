import React, { useMemo, useState } from 'react';
import { useT } from '@/hooks/useLang';
import { levelText } from '@/i18n';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronsUp, Sparkles } from 'lucide-react';
import type { CardTemplate, CombatRole, OwnedCard } from '@/types';
import { ATTRIBUTE_LABEL, COMBAT_ROLES, ROLE_LABEL } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { Badge, Button, EmptyState, Input, Modal, Panel, Progress, SectionTitle } from '@/components/ui';
import { PlayerCard } from '@/components/PlayerCard';
import { ECONOMY, LEVEL_CONFIG, RARITY_TABLE, TRAINING_DRILLS } from '@/data/config';
import { trTrainingExt } from '@/i18n/areas/training-ext';
import { cardOVR, xpProgress } from '@/engine/rating';
import { GrowthPreview } from '@/features/training/GrowthPreview';
import { TrainingLog } from '@/features/training/TrainingLog';
import { Avatar } from '@/components/Avatar';

interface TrainerEntry {
  card: OwnedCard;
  template: CardTemplate;
  nickname: string;
  countryCode: string;
  ovr: number;
  /** 同名卡数量（训练时一起升级）。 */
  copies: number;
}

/** 满级判定，与 store 的 trainPlayer / trainSquad 保持同一口径。 */
function isMaxed(card: OwnedCard): boolean {
  return card.level >= LEVEL_CONFIG.maxLevel && card.xp >= LEVEL_CONFIG.xpTable[LEVEL_CONFIG.maxLevel - 1];
}

function bestOwned(owned: OwnedCard[]): OwnedCard {
  return owned.reduce((a, b) => (b.level > a.level || (b.level === a.level && b.xp > a.xp) ? b : a));
}

export type SquadPlanMode = 'full' | 'partial' | 'short' | 'capped';

export interface SquadPlan {
  drillId: string;
  /** 每人单价（不改经济数值，直接取训练项目定价）。 */
  perCost: number;
  /** 阵容里实际可以被训练的选手数（同名卡按一张算、已满级的不算）。 */
  members: number;
  /** 当前金币能训练的人数。 */
  affordable: number;
  /** 完整训练全队的费用。 */
  fullCost: number;
  /** 本次点击实际会扣掉的费用。 */
  cost: number;
  /** 首发人数（含满级/找不到卡的情况）。 */
  lineup: number;
  mode: SquadPlanMode;
}

/**
 * 整队训练的费用/人数预览。口径与 store.trainSquad 完全一致：
 * 首发槽位 → 去重后的 templateId → 过滤掉缺模板与已满级 → 金币够几人就训练几人。
 */
export function planSquadTraining({
  cards, templates, slots, drillId, coins,
}: {
  cards: OwnedCard[];
  templates: Record<string, CardTemplate>;
  slots: Record<CombatRole, string | null>;
  drillId: string;
  coins: number;
}): SquadPlan {
  const drill = TRAINING_DRILLS.find((d) => d.id === drillId) ?? TRAINING_DRILLS[0];
  const perCost: number = drill.cost;
  const lineup = COMBAT_ROLES.map((role) => slots[role]).filter((id): id is string => Boolean(id));
  const templateIds = Array.from(new Set(lineup
    .map((id) => cards.find((c) => c.instanceId === id)?.templateId)
    .filter((id): id is string => Boolean(id))));
  const members = templateIds.filter((templateId) => {
    if (!templates[templateId]) return false;
    const owned = cards.filter((c) => c.templateId === templateId);
    if (owned.length === 0) return false;
    return !isMaxed(bestOwned(owned));
  }).length;
  const affordable = Math.min(members, Math.floor(coins / perCost));
  const mode: SquadPlanMode = members === 0
    ? 'capped'
    : affordable >= members ? 'full' : affordable > 0 ? 'partial' : 'short';
  return {
    drillId: drill.id,
    perCost,
    members,
    affordable,
    fullCost: perCost * members,
    cost: perCost * affordable,
    lineup: lineup.length,
    mode,
  };
}

export interface LevelUpPlan {
  /** 逐级升级单价：沿用 ECONOMY.levelUpCoins，不打折。 */
  perLevel: number;
  /** 距离满级还差的级数。 */
  steps: number;
  /** 从当前等级升满需要的金币。 */
  fullCost: number;
  /** 本次点击实际会扣掉的金币（受预算限制）。 */
  cost: number;
  /** 本次能升到的等级。 */
  targetLevel: number;
}

/**
 * 单名选手升满的费用/等级预览：单价取 ECONOMY.levelUpCoins，逐级累加，不打折。
 * 金币不够就停在能到的等级，与 store.levelUpCards 同一口径。
 */
export function planLevelUp(level: number, budget: number, perLevel: number = ECONOMY.levelUpCoins): LevelUpPlan {
  const price = Math.max(1, perLevel);
  const remain = Math.max(0, LEVEL_CONFIG.maxLevel - level);
  const steps = Math.min(remain, Math.floor(Math.max(0, budget) / price));
  return {
    perLevel: price,
    steps,
    fullCost: remain * price,
    cost: steps * price,
    targetLevel: level + steps,
  };
}

export interface SquadLevelUpEntry {
  templateId: string;
  level: number;
  targetLevel: number;
  cost: number;
}

export interface SquadLevelUpPlan {
  perLevel: number;
  /** 可升级的首发人数（同名卡去重、已满级的不算）。 */
  members: number;
  /** 每人预算 = floor(当前金币 / 人数)。 */
  budget: number;
  /** 预计总花费。 */
  cost: number;
  /** 预计会升级的人数。 */
  upgraded: number;
  entries: SquadLevelUpEntry[];
  mode: 'capped' | 'short' | 'ready';
}

/**
 * 整队升满的预算预览：金币按可升级的首发人数平均分配（每人 floor(余额 / 人数)），
 * 各自在自己预算内升到能到的最高等级；单价与 store.levelUpCards 一致，不打折。
 */
export function planSquadLevelUp({
  cards, slots, coins, perLevel = ECONOMY.levelUpCoins,
}: {
  cards: OwnedCard[];
  slots: Record<CombatRole, string | null>;
  coins: number;
  perLevel?: number;
}): SquadLevelUpPlan {
  const price = Math.max(1, perLevel);
  const lineup = COMBAT_ROLES.map((role) => slots[role]).filter((id): id is string => Boolean(id));
  const templateIds = Array.from(new Set(lineup
    .map((id) => cards.find((c) => c.instanceId === id)?.templateId)
    .filter((id): id is string => Boolean(id))));
  const upgradable = templateIds.filter((templateId) => {
    const owned = cards.filter((c) => c.templateId === templateId);
    if (owned.length === 0) return false;
    return bestOwned(owned).level < LEVEL_CONFIG.maxLevel;
  });
  const members = upgradable.length;
  const budget = members === 0 ? 0 : Math.floor(Math.max(0, coins) / members);
  const entries = upgradable.map((templateId) => {
    const from = bestOwned(cards.filter((c) => c.templateId === templateId)).level;
    const plan = planLevelUp(from, budget, price);
    return { templateId, level: from, targetLevel: plan.targetLevel, cost: plan.cost };
  });
  return {
    perLevel: price,
    members,
    budget,
    cost: entries.reduce((sum, entry) => sum + entry.cost, 0),
    upgraded: entries.filter((entry) => entry.cost > 0).length,
    entries,
    mode: members === 0 ? 'capped' : budget < price ? 'short' : 'ready',
  };
}

function EntryRow({
  entry, selected, onSelect,
}: { entry: TrainerEntry; selected: boolean; onSelect: () => void }) {
  const { tr } = useT();
  const rowXp = xpProgress(entry.card.xp);
  const rowRarity = RARITY_TABLE[entry.template.rarity];
  return (
    <button
      type='button'
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition',
        selected ? 'border-accent/45 bg-accent/[0.08]' : 'border-white/5 bg-ink-900/40 hover:border-white/15',
      )}
    >
      <Avatar
        playerId={entry.template.playerId}
        nickname={entry.nickname}
        size={32}
        accent={rowRarity.color}
        shape='square'
        className='shrink-0'
      />
      <span className='min-w-0 flex-1'>
        <span className='flex items-center gap-1.5'>
          <span data-testid='entry-nickname' className='truncate font-display text-[14px] font-semibold text-txt'>{entry.nickname}</span>
          <span className='rounded bg-black/40 px-1 text-[11px] font-semibold text-txt-muted'>
            {tr(ROLE_LABEL[entry.template.primaryRole])}
          </span>
          {entry.copies > 1 ? (
            <span className='rounded bg-white/10 px-1 text-[11px] font-semibold text-txt-muted'>×{entry.copies}</span>
          ) : null}
        </span>
        <span className='mt-1 flex items-center gap-2'>
          <span className='min-w-0 flex-1'>
            <Progress value={rowXp.pct * 100} height='h-1' tone='blue' />
          </span>
          <span className='shrink-0 text-[12px] text-txt-muted'>{entry.card.level} {tr('级')}</span>
        </span>
      </span>
      <span className='shrink-0 font-display text-[15px] font-semibold' style={{ color: rowRarity.color }}>
        {entry.ovr}
      </span>
    </button>
  );
}

function matchesQuery(entry: TrainerEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle ? entry.nickname.toLowerCase().includes(needle) : true;
}

export function RosterTraining() {
  const { tr, pick } = useT();
  const cards = useGameStore((s) => s.cards);
  const customTemplates = useGameStore((s) => s.customTemplates);
  const customPlayers = useGameStore((s) => s.customPlayers);
  const templates = useGameStore((s) => s.templates);
  const players = useGameStore((s) => s.players);
  const coins = useGameStore((s) => s.club.coins);
  const trainPlayer = useGameStore((s) => s.trainPlayer);
  const trainSquad = useGameStore((s) => s.trainSquad);
  const levelUpCards = useGameStore((s) => s.levelUpCards);
  const celebrate = useGameStore((s) => s.celebrate);
  const squadSlots = useGameStore((s) => s.squad.slots);
  const toast = useGameStore((s) => s.toast);
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [squadDrill, setSquadDrill] = useState<string>(TRAINING_DRILLS[0].id);
  /** 移动端紧凑名单（弹出式）。 */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  /** 上一次整队训练的实付结果：人数与金额都取自 store 的返回值。 */
  const [squadResult, setSquadResult] = useState<{ trained: number; spent: number; members: number } | null>(null);
  /** 上一次「升满当前选手」的真实结果：等级、实付与距离满级的差额。 */
  const [levelResult, setLevelResult] = useState<{ to: number; spent: number; shortfall: number } | null>(null);
  /** 上一次「升满全队」的真实结果：人数、最高等级与实付。 */
  const [squadLevelResult, setSquadLevelResult] = useState<{ upgraded: number; top: number; spent: number } | null>(null);

  const allEntries = useMemo<TrainerEntry[]>(() => {
    const templateMap = templates();
    const playerMap = players();
    const out: TrainerEntry[] = [];
    const byTemplate = new Map<string, OwnedCard[]>();
    cards.forEach((card) => {
      const list = byTemplate.get(card.templateId) ?? [];
      list.push(card);
      byTemplate.set(card.templateId, list);
    });
    byTemplate.forEach((list, templateId) => {
      const template = templateMap[templateId];
      if (!template) return;
      const identity = playerMap[template.playerId];
      const nickname = identity ? identity.nickname : template.playerId;
      // 同名卡聚合成一行：以等级/经验最高的那张为代表
      const best = bestOwned(list);
      out.push({
        card: best,
        template,
        nickname,
        countryCode: identity ? identity.countryCode : '??',
        ovr: cardOVR(template, best.level, best.stars ?? 1),
        copies: list.length,
      });
    });
    return out.sort((a, b) => (b.ovr - a.ovr) || a.nickname.localeCompare(b.nickname));
  }, [cards, templates, players, customTemplates, customPlayers]);

  const entries = useMemo(() => allEntries.filter((entry) => matchesQuery(entry, query)), [allEntries, query]);
  const pickerEntries = useMemo(
    () => allEntries.filter((entry) => matchesQuery(entry, pickerQuery)),
    [allEntries, pickerQuery],
  );
  const selected = entries.find((entry) => entry.template.id === selectedId) ?? entries[0];
  const squadPlan = useMemo(
    () => planSquadTraining({ cards, templates: templates(), slots: squadSlots, drillId: squadDrill, coins }),
    [cards, templates, customTemplates, squadSlots, squadDrill, coins],
  );
  const squadLevelPlan = useMemo(
    () => planSquadLevelUp({ cards, slots: squadSlots, coins }),
    [cards, squadSlots, coins],
  );

  // ── 以下所有 Hook 都已执行完毕，条件 return 不会再打乱 Hook 顺序 ──
  if (cards.length === 0) {
    return (
      <Panel>
        <EmptyState
          title={tr('还没有可训练的卡牌')}
          hint={tr('先从卡包签下第一位选手——之后每张卡牌都可以通过训练获得经验与永久属性成长。')}
          action={<Button className='mt-2' onClick={() => navigate('/packs')}>{tr('开启卡包')}</Button>}
        />
      </Panel>
    );
  }

  if (!selected) {
    return (
      <Panel>
        <EmptyState
          title={tr('没有符合搜索条件的卡牌')}
          hint={tr('清空搜索框即可看到全部收藏。')}
          action={query.trim() ? (
            <Button className='mt-2' variant='outline' onClick={() => setQuery('')}>{tr('清空搜索')}</Button>
          ) : undefined}
        />
      </Panel>
    );
  }

  const xp = xpProgress(selected.card.xp);
  const atCap = isMaxed(selected.card);
  const rarity = RARITY_TABLE[selected.template.rarity];
  const lineup = COMBAT_ROLES.map((role) => squadSlots[role]).filter((id): id is string => Boolean(id));
  const lineupNames = lineup
    .map((id) => allEntries.find((entry) => entry.card.instanceId === id)?.nickname)
    .filter((name): name is string => Boolean(name));
  const squadLocked = squadPlan.mode === 'short' || squadPlan.mode === 'capped';
  const squadLabel = squadPlan.mode === 'partial'
    ? tr('训练 ') + squadPlan.affordable + tr(' 人') + tr('（') + squadPlan.cost.toLocaleString() + tr(' 金币）')
    : tr('一键训练全队') + tr('（') + squadPlan.fullCost.toLocaleString() + tr(' 金币）');
  const squadStatus = squadPlan.mode === 'full'
    ? tr('可完整训练全队 ') + squadPlan.members + tr(' 人，共 ') + squadPlan.fullCost.toLocaleString() + tr(' 金币。')
    : squadPlan.mode === 'partial'
      ? tr('金币不足，本次只能训练 ') + squadPlan.affordable + ' / ' + squadPlan.members + tr(' 人，花费 ')
        + squadPlan.cost.toLocaleString() + tr(' 金币，剩余 ') + (squadPlan.members - squadPlan.affordable) + tr(' 人未训练。')
      : squadPlan.mode === 'short'
        ? tr('金币不足，连一名首发都训练不了——先去打比赛赚金币。')
        : tr('首发的选手都已满级，不需要再训练。');
  const squadStatusTone = squadPlan.mode === 'partial'
    ? 'border-accent/30 bg-accent/[0.08] text-accent'
    : squadPlan.mode === 'short'
      ? 'border-danger/30 bg-danger/10 text-danger'
      : 'border-white/10 bg-ink-900/50 text-txt-muted';
  // —— 一键升满：单价取 ECONOMY.levelUpCoins，逐级累加，不动经验曲线 ——
  const levelPlan = planLevelUp(selected.card.level, coins);
  const levelCap = LEVEL_CONFIG.maxLevel;
  const levelAtCap = selected.card.level >= levelCap;
  const levelSoldOut = !levelAtCap && coins < levelPlan.perLevel;
  const levelLocked = levelAtCap || levelPlan.cost === 0;
  const levelLabel = levelAtCap
    ? trTrainingExt('一键升满当前选手') + trTrainingExt('（已满级）')
    : levelSoldOut
      ? trTrainingExt('一键升满当前选手') + trTrainingExt('（预算不足）')
      : trTrainingExt('一键升满当前选手') + trTrainingExt('（') + levelPlan.fullCost.toLocaleString() + trTrainingExt(' 金币）');
  const levelStatus = levelAtCap
    ? trTrainingExt('该选手已满级，不需要再升级。')
    : levelSoldOut
      ? trTrainingExt('预算不足：升级单价 ') + levelPlan.perLevel + trTrainingExt(' 金币，当前金币 ') + coins.toLocaleString() + trTrainingExt('。')
      : levelPlan.targetLevel >= levelCap
        ? trTrainingExt('升满到 ') + levelCap + trTrainingExt(' 级，共 ') + levelPlan.fullCost.toLocaleString() + trTrainingExt(' 金币。')
        : trTrainingExt('金币不足，本次能升到 ') + levelPlan.targetLevel + trTrainingExt(' 级，花费 ') + levelPlan.cost.toLocaleString()
          + trTrainingExt(' 金币（还差 ') + (levelPlan.fullCost - coins).toLocaleString() + trTrainingExt(' 金币可满级）。');
  const squadLevelLocked = squadLevelPlan.members === 0 || squadLevelPlan.budget < squadLevelPlan.perLevel;
  const squadLevelLabel = squadLevelPlan.members === 0
    ? trTrainingExt('一键升满全队') + trTrainingExt('（已满级）')
    : squadLevelPlan.budget < squadLevelPlan.perLevel
      ? trTrainingExt('一键升满全队') + trTrainingExt('（预算不足）')
      : trTrainingExt('一键升满全队') + trTrainingExt('（') + squadLevelPlan.budget.toLocaleString() + trTrainingExt(' 金币）');
  const squadLevelStatus = squadLevelPlan.members === 0
    ? trTrainingExt('首发的选手都已满级，不需要再升级。')
    : squadLevelPlan.mode === 'short'
      ? trTrainingExt('预算不足：') + squadLevelPlan.members + trTrainingExt(' 人分 ') + coins.toLocaleString() + trTrainingExt(' 金币，每人 ')
        + squadLevelPlan.budget.toLocaleString() + trTrainingExt(' 金币，低于升级单价 ') + squadLevelPlan.perLevel + trTrainingExt(' 金币/级。')
      : trTrainingExt('每人预算 ') + squadLevelPlan.budget.toLocaleString() + trTrainingExt(' 金币：预计 ') + squadLevelPlan.upgraded
        + trTrainingExt(' 人升级，共 ') + squadLevelPlan.cost.toLocaleString() + trTrainingExt(' 金币。');
  const levelResultText = levelResult === null
    ? ''
    : levelResult.shortfall > 0
      ? trTrainingExt('升到 ') + levelResult.to + trTrainingExt(' 级，花费 ') + levelResult.spent.toLocaleString()
        + trTrainingExt(' 金币，还差 ') + levelResult.shortfall.toLocaleString() + trTrainingExt(' 金币可满级')
      : trTrainingExt('已升到 ') + levelResult.to + trTrainingExt(' 级（满级），花费 ') + levelResult.spent.toLocaleString() + trTrainingExt(' 金币');
  const squadLevelResultText = squadLevelResult === null
    ? ''
    : trTrainingExt('上次整队升满：') + squadLevelResult.upgraded + trTrainingExt(' 人升级，最高 ') + squadLevelResult.top
      + trTrainingExt(' 级，实付 ') + squadLevelResult.spent.toLocaleString() + trTrainingExt(' 金币');

  function runDrill(drillId: string) {
    if (!selected) return;
    const before = selected.card.level;
    const result = trainPlayer(selected.template.id, drillId);
    if (!result.ok && result.error) { toast(result.error, 'error'); return; }
    const after = useGameStore.getState().cards.find((c) => c.templateId === selected.template.id);
    if (after && after.level > before) {
      celebrate({
        title: selected.nickname + pick(' 升到 ', ' reached ') + levelText(after.level) + pick('', ''),
        subtitle: pick('全属性成长 +', 'All attributes +') + (after.level - before) * 3 + pick(' 点', ' pts'),
        tone: 'level',
      });
    }
  }

  function runSquadDrill() {
    const planned = squadPlan.members;
    const result = trainSquad(squadPlan.drillId);
    if (!result.ok) {
      if (result.error) toast(result.error, 'error');
      return;
    }
    setSquadResult({ trained: result.trained ?? 0, spent: result.spent ?? 0, members: planned });
  }

  function runLevelUpCurrent() {
    if (!selected) return;
    const plan = planLevelUp(selected.card.level, coins);
    const result = levelUpCards([{ templateId: selected.template.id, budget: coins }]);
    if (!result.ok) {
      if (result.error) toast(result.error, 'error');
      return;
    }
    const row = result.results ? result.results[0] : undefined;
    if (!row) return;
    const left = useGameStore.getState().club.coins;
    const shortfall = Math.max(0, (levelCap - row.to) * plan.perLevel - left);
    const nickname = selected.nickname;
    setLevelResult({ to: row.to, spent: row.spent, shortfall });
    toast(shortfall > 0
      ? trTrainingExt('升到 ') + row.to + trTrainingExt(' 级，花费 ') + row.spent.toLocaleString()
        + trTrainingExt(' 金币，还差 ') + shortfall.toLocaleString() + trTrainingExt(' 金币可满级')
      : trTrainingExt('已升到 ') + row.to + trTrainingExt(' 级（满级），花费 ') + row.spent.toLocaleString() + trTrainingExt(' 金币'), 'success');
    if (row.levels > 0) {
      celebrate({
        title: nickname + pick(' 升到 ', ' reached ') + levelText(row.to),
        subtitle: pick('全属性成长 +', 'All attributes +') + row.levels * LEVEL_CONFIG.growthPointsPerLevel + pick(' 点', ' pts'),
        tone: 'level',
      });
    }
  }

  function runLevelUpSquad() {
    const plan = squadLevelPlan;
    if (plan.members === 0) return;
    const result = levelUpCards(plan.entries.map((entry) => ({ templateId: entry.templateId, budget: plan.budget })));
    if (!result.ok) {
      if (result.error) toast(result.error, 'error');
      return;
    }
    const rows = result.results ?? [];
    const top = rows.reduce((max, row) => Math.max(max, row.to), 0);
    const spent = result.spent ?? 0;
    setSquadLevelResult({ upgraded: rows.length, top, spent });
    toast(trTrainingExt('一键升满全队：') + rows.length + trTrainingExt(' 人升级，最高 ') + top
      + trTrainingExt(' 级，实付 ') + spent.toLocaleString() + trTrainingExt(' 金币'), 'success');
  }

  function openPicker() {
    setPickerQuery('');
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    setPickerQuery('');
  }

  function pickEntry(templateId: string) {
    setSelectedId(templateId);
    closePicker();
  }

  return (
    <div className='space-y-4'>
      {/* 移动端常驻「当前选手」条：小屏不用滚过整条名单也能训练 */}
      <div className='sticky top-1 z-20 xl:hidden'>
        <div className='surface flex items-center gap-2.5 p-2.5' data-testid='training-current-player'>
          <Avatar
            playerId={selected.template.playerId}
            nickname={selected.nickname}
            size={38}
            accent={rarity.color}
            shape='square'
            className='shrink-0'
          />
          <div className='min-w-0 flex-1'>
            <div className='label-xs'>{tr('当前选手')}</div>
            <div className='flex min-w-0 items-center gap-1.5'>
              <span className='truncate font-display text-[15px] font-semibold text-txt'>{selected.nickname}</span>
              <span className='shrink-0 rounded bg-black/40 px-1 text-[11px] font-semibold text-txt-muted'>
                {tr(ROLE_LABEL[selected.template.primaryRole])}
              </span>
              <span className='shrink-0 text-[12px] text-txt-muted'>{selected.card.level} {tr('级')}</span>
            </div>
          </div>
          <span className='shrink-0 font-display text-[16px] font-semibold' style={{ color: rarity.color }}>
            {selected.ovr}
          </span>
          <Button size='sm' variant='outline' onClick={openPicker}>{tr('换人')}</Button>
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]'>
        <Panel className='hidden xl:block xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto'>
          <div className='mb-2 flex items-center justify-between'>
            <div className='label-xs'>{tr('收藏')} · {cards.length} {tr('张')} · {entries.length} {tr('名选手')}</div>
            <div className='text-[12px] text-txt-muted'>{tr('同名卡合并显示')}</div>
          </div>
          <Input value={query} onChange={setQuery} placeholder={tr('搜索选手')} />
          {entries.length === 0 ? (
            <EmptyState
              title={tr('没有符合搜索条件的卡牌')}
              hint={tr('清空搜索框即可看到全部收藏。')}
              action={<Button className='mt-1' size='sm' variant='outline' onClick={() => setQuery('')}>{tr('清空搜索')}</Button>}
            />
          ) : (
            <div className='mt-2 space-y-1.5'>
              {entries.map((entry) => (
                <EntryRow
                  key={entry.template.id}
                  entry={entry}
                  selected={entry.template.id === selected.template.id}
                  onSelect={() => setSelectedId(entry.template.id)}
                />
              ))}
            </div>
          )}
        </Panel>

        <div className='space-y-4'>
          <Panel>
            <SectionTitle
              title={tr('现在阵容')}
              subtitle={tr('按当前首发五人一键训练——同名卡一起升级，按人数扣费。')}
            />
            {squadPlan.lineup === 0 ? (
              <p className='text-[13px] text-txt-muted'>{tr('首发阵容还是空的——先到「阵容」页面指派 5 名选手。')}</p>
            ) : (
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-1.5 text-[13px] text-txt-muted'>
                  <span className='text-txt'>{squadPlan.lineup} {tr('人：')}</span>
                  {lineupNames.map((name) => (
                    <span key={name} className='rounded bg-white/5 px-1.5 py-0.5'>{name}</span>
                  ))}
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <select
                    value={squadDrill}
                    onChange={(event) => setSquadDrill(event.target.value)}
                    aria-label={tr('训练项目')}
                    className='rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 text-[13px] text-txt'
                  >
                    {TRAINING_DRILLS.map((drill) => (
                      <option key={drill.id} value={drill.id}>{tr(drill.label)}{tr('（')}{drill.cost}{tr(' 金币/人）')}</option>
                    ))}
                  </select>
                  <Button
                    size='sm'
                    variant={squadPlan.mode === 'partial' ? 'outline' : 'primary'}
                    disabled={squadLocked}
                    onClick={runSquadDrill}
                  >
                    <Sparkles size={13} /> {squadLabel}
                  </Button>
                  <Button size='sm' variant='outline' disabled={levelLocked} onClick={runLevelUpCurrent}>
                    <ChevronsUp size={13} /> {levelLabel}
                  </Button>
                  <Button size='sm' variant='outline' disabled={squadLevelLocked} onClick={runLevelUpSquad}>
                    <ChevronsUp size={13} /> {squadLevelLabel}
                  </Button>
                </div>
                <p className={clsx('rounded-lg border px-2 py-1.5 text-[12px]', squadStatusTone)}>{squadStatus}</p>
                {squadResult ? (
                  <p className='rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-[12px] text-emerald-300'>
                    {tr('上次整队训练：')}{squadResult.trained} / {squadResult.members}{tr(' 人 · 实付 ')}
                    {squadResult.spent.toLocaleString()}{tr(' 金币')}
                  </p>
                ) : null}
                <p className={clsx(
                  'rounded-lg border px-2 py-1.5 text-[12px]',
                  levelSoldOut ? 'border-danger/30 bg-danger/10 text-danger' : 'border-white/10 bg-ink-900/50 text-txt-muted',
                )}
                >
                  {levelStatus}
                </p>
                <p className={clsx(
                  'rounded-lg border px-2 py-1.5 text-[12px]',
                  squadLevelPlan.mode === 'short' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-white/10 bg-ink-900/50 text-txt-muted',
                )}
                >
                  {squadLevelStatus}
                </p>
                {levelResult ? (
                  <p className='rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-[12px] text-emerald-300'>{levelResultText}</p>
                ) : null}
                {squadLevelResult ? (
                  <p className='rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-[12px] text-emerald-300'>{squadLevelResultText}</p>
                ) : null}
              </div>
            )}
          </Panel>

          <Panel className='space-y-4'>
            <div className='flex flex-wrap items-start gap-4'>
              <PlayerCard
                card={{
                  template: selected.template,
                  nickname: selected.nickname,
                  countryCode: selected.countryCode,
                  ovr: selected.ovr,
                  level: selected.card.level,
                  stars: selected.card.stars ?? 1,
                  mastery: selected.card.mastery,
                }}
                size='sm'
              />
              <div className='min-w-0 flex-1 space-y-3'>
                <div>
                  <div className='flex flex-wrap items-center gap-1.5'>
                    <h3 className='font-display text-lg font-semibold text-txt'>{selected.nickname}</h3>
                    <Badge tone='accent'>{tr(rarity.label)}</Badge>
                    <Badge tone={atCap ? 'success' : 'muted'}>
                      {atCap ? tr('已满级') : selected.card.level + '/' + LEVEL_CONFIG.maxLevel + ' ' + tr('级')}
                    </Badge>
                    {selected.copies > 1 ? <Badge tone='muted'>{tr('同名卡')} ×{selected.copies}</Badge> : null}
                  </div>
                  <p className='mt-0.5 text-[12px] text-txt-muted'>
                    {selected.template.season} · {tr(ROLE_LABEL[selected.template.primaryRole])} / {tr(ROLE_LABEL[selected.template.secondaryRole])} ·
                    {' '}{tr(selected.template.skill.name)}
                  </p>
                </div>

                <div>
                  <div className='mb-1 flex items-center justify-between text-[12px] text-txt-muted'>
                    <span>{tr('经验进度')}</span>
                    <span className='font-semibold text-txt'>
                      {atCap ? tr('已满级') : xp.current + ' / ' + xp.required + ' ' + tr('经验')}
                    </span>
                  </div>
                  <Progress value={atCap ? 100 : xp.pct * 100} tone={atCap ? 'success' : 'accent'} height='h-2' />
                  <div className='mt-1 flex items-center justify-between text-[12px] text-txt-muted'>
                    <span>{tr('累计')} {selected.card.xp} {tr('经验')} · {tr('成长倍率')} ×{selected.template.growth.toFixed(2)}</span>
                    <span>{tr('等级上限')} {LEVEL_CONFIG.maxLevel}</span>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                  {TRAINING_DRILLS.map((drill) => {
                    const gain = Math.round(drill.xp * selected.template.growth);
                    const affordable = coins >= drill.cost;
                    const disabled = atCap || !affordable;
                    return (
                      <button
                        key={drill.id}
                        type='button'
                        disabled={disabled}
                        onClick={() => runDrill(drill.id)}
                        className={clsx(
                          'rounded-xl border px-3 py-2 text-left transition',
                          disabled
                            ? 'cursor-not-allowed border-white/5 bg-ink-900/40 opacity-55'
                            : 'border-white/10 bg-ink-800/60 hover:border-accent/40 hover:bg-accent/[0.06]',
                        )}
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <span className='font-display text-[14px] font-semibold text-txt'>{tr(drill.label)}</span>
                          <span className='inline-flex items-center gap-1 text-[12px] font-semibold text-accent'>
                            <span>+{gain} {tr('经验')}</span>
                          </span>
                        </div>
                        <div className='mt-1 flex items-center justify-between text-[12px] text-txt-muted'>
                          <span>{tr('主练')} {tr(ATTRIBUTE_LABEL[drill.focus])}</span>
                          <span>{drill.cost} {tr('金币')}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {coins < Math.min(...TRAINING_DRILLS.map((drill) => drill.cost)) ? (
                  <p className='rounded-lg border border-danger/30 bg-danger/10 px-2 py-1.5 text-[12px] text-danger'>
                    {tr('金币不足，无法进行任何训练。打比赛可以赚取更多金币。')}
                  </p>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title={tr('下一级将获得')} subtitle={tr('成长预估与永久属性上限。')} />
            <GrowthPreview template={selected.template} level={selected.card.level} stars={selected.card.stars ?? 1} />
          </Panel>

          <Panel>
            <SectionTitle title={tr('最近训练记录')} subtitle={tr('最近 8 条。')} />
            <TrainingLog />
          </Panel>
        </div>
      </div>

      <Modal open={pickerOpen} onClose={closePicker} title={tr('选择选手')}>
        <div className='space-y-2'>
          <Input value={pickerQuery} onChange={setPickerQuery} placeholder={tr('搜索选手')} />
          {pickerEntries.length === 0 ? (
            <EmptyState
              title={tr('没有符合搜索条件的卡牌')}
              hint={tr('清空搜索框即可看到全部收藏。')}
              action={<Button className='mt-1' size='sm' variant='outline' onClick={() => setPickerQuery('')}>{tr('清空搜索')}</Button>}
            />
          ) : (
            <div className='space-y-1.5'>
              {pickerEntries.map((entry) => (
                <EntryRow
                  key={entry.template.id}
                  entry={entry}
                  selected={entry.template.id === selected.template.id}
                  onSelect={() => pickEntry(entry.template.id)}
                />
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
