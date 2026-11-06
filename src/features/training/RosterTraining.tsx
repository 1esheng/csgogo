import React, { useMemo, useState } from 'react';
import { useT } from '@/hooks/useLang';
import { levelText } from '@/i18n';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Sparkles } from 'lucide-react';
import type { CardTemplate, OwnedCard } from '@/types';
import { ATTRIBUTE_LABEL, COMBAT_ROLES, ROLE_LABEL } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { Badge, Button, EmptyState, Input, Panel, Progress, SectionTitle } from '@/components/ui';
import { PlayerCard } from '@/components/PlayerCard';
import { LEVEL_CONFIG, RARITY_TABLE, TRAINING_DRILLS } from '@/data/config';
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
  const squadSlots = useGameStore((s) => s.squad.slots);
  const toast = useGameStore((s) => s.toast);
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [squadDrill, setSquadDrill] = useState<string>(TRAINING_DRILLS[0].id);

  const entries = useMemo<TrainerEntry[]>(() => {
    const templateMap = templates();
    const playerMap = players();
    const needle = query.trim().toLowerCase();
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
      if (needle && !nickname.toLowerCase().includes(needle)) return;
      // 同名卡聚合成一行：以等级/经验最高的那张为代表
      const best = list.reduce((a, b) => (b.level > a.level || (b.level === a.level && b.xp > a.xp) ? b : a));
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
  }, [cards, templates, players, query, customTemplates, customPlayers]);

  const selected = entries.find((entry) => entry.template.id === selectedId) ?? entries[0];

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
        <EmptyState title={tr('没有符合搜索条件的卡牌')} hint={tr('清空搜索框即可看到全部收藏。')} />
      </Panel>
    );
  }

  const xp = xpProgress(selected.card.xp);
  const atCap = selected.card.level >= LEVEL_CONFIG.maxLevel
    && selected.card.xp >= LEVEL_CONFIG.xpTable[LEVEL_CONFIG.maxLevel - 1];
  const rarity = RARITY_TABLE[selected.template.rarity];
  const lineup = COMBAT_ROLES.map((role) => squadSlots[role]).filter((id): id is string => Boolean(id));
  const lineupNames = lineup
    .map((id) => entries.find((entry) => entry.card.instanceId === id)?.nickname)
    .filter((name): name is string => Boolean(name));
  const squadDrillSpec = TRAINING_DRILLS.find((d) => d.id === squadDrill) ?? TRAINING_DRILLS[0];

  const celebrate = useGameStore((s) => s.celebrate);

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

  return (
    <div className='grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <Panel className='xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto'>
        <div className='mb-2 flex items-center justify-between'>
          <div className='label-xs'>{tr('收藏')} · {cards.length} {tr('张')} · {entries.length} {tr('名选手')}</div>
          <div className='text-[11px] text-txt-muted'>{tr('同名卡合并显示')}</div>
        </div>
        <Input value={query} onChange={setQuery} placeholder={tr('搜索选手')} />
        {entries.length === 0 ? (
          <EmptyState title={tr('没有符合搜索条件的卡牌')} hint={tr('清空搜索框即可看到全部收藏。')} />
        ) : (
          <div className='mt-2 space-y-1.5'>
            {entries.map((entry) => {
              const isSelected = entry.template.id === selected.template.id;
              const rowXp = xpProgress(entry.card.xp);
              const rowRarity = RARITY_TABLE[entry.template.rarity];
              return (
                <button
                  key={entry.template.id}
                  type='button'
                  onClick={() => setSelectedId(entry.template.id)}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition',
                    isSelected ? 'border-accent/45 bg-accent/[0.08]' : 'border-white/5 bg-ink-900/40 hover:border-white/15',
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
                      <span className='truncate font-display text-[13px] font-semibold text-txt'>{entry.nickname}</span>
                      <span className='rounded bg-black/40 px-1 text-[9px] font-semibold text-txt-muted'>
                        {tr(ROLE_LABEL[entry.template.primaryRole])}
                      </span>
                      {entry.copies > 1 ? (
                        <span className='rounded bg-white/10 px-1 text-[9px] font-semibold text-txt-muted'>×{entry.copies}</span>
                      ) : null}
                    </span>
                    <span className='mt-1 flex items-center gap-2'>
                      <span className='min-w-0 flex-1'>
                        <Progress value={rowXp.pct * 100} height='h-1' tone='blue' />
                      </span>
                      <span className='shrink-0 text-[10px] text-txt-muted'>{entry.card.level} {tr('级')}</span>
                    </span>
                  </span>
                  <span className='shrink-0 font-display text-sm font-semibold' style={{ color: rowRarity.color }}>
                    {entry.ovr}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      <div className='space-y-4'>
        <Panel>
          <SectionTitle
            title={tr('现在阵容')}
            subtitle={tr('按当前首发五人一键训练——同名卡一起升级，按人数扣费。')}
          />
          {lineup.length === 0 ? (
            <p className='text-xs text-txt-muted'>{tr('首发阵容还是空的——先到「阵容」页面指派 5 名选手。')}</p>
          ) : (
            <div className='space-y-2'>
              <div className='flex flex-wrap items-center gap-1.5 text-xs text-txt-muted'>
                <span className='text-txt'>{lineup.length} {tr('人：')}</span>
                {lineupNames.map((name) => (
                  <span key={name} className='rounded bg-white/5 px-1.5 py-0.5'>{name}</span>
                ))}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <select
                  value={squadDrill}
                  onChange={(event) => setSquadDrill(event.target.value)}
                  className='rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 text-xs text-txt'
                >
                  {TRAINING_DRILLS.map((drill) => (
                    <option key={drill.id} value={drill.id}>{tr(drill.label)}{tr('（')}{drill.cost}{tr(' 金币/人）')}</option>
                  ))}
                </select>
                <Button size='sm' disabled={coins < squadDrillSpec.cost} onClick={() => trainSquad(squadDrill)}>
                  <Sparkles size={13} /> {tr('一键训练全队')}{tr('（')}{(squadDrillSpec.cost * lineup.length).toLocaleString()}{tr(' 金币）')}
                </Button>
              </div>
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
                <p className='mt-0.5 text-[11px] text-txt-muted'>
                  {selected.template.season} · {tr(ROLE_LABEL[selected.template.primaryRole])} / {tr(ROLE_LABEL[selected.template.secondaryRole])} ·
                  {' '}{tr(selected.template.skill.name)}
                </p>
              </div>

              <div>
                <div className='mb-1 flex items-center justify-between text-[11px] text-txt-muted'>
                  <span>{tr('经验进度')}</span>
                  <span className='font-semibold text-txt'>
                    {atCap ? tr('已满级') : xp.current + ' / ' + xp.required + ' XP'}
                  </span>
                </div>
                <Progress value={atCap ? 100 : xp.pct * 100} tone={atCap ? 'success' : 'accent'} height='h-2' />
                <div className='mt-1 flex items-center justify-between text-[10px] text-txt-muted'>
                  <span>{tr('累计')} {selected.card.xp} XP · {tr('成长倍率')} ×{selected.template.growth.toFixed(2)}</span>
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
                        <span className='font-display text-[13px] font-semibold text-txt'>{tr(drill.label)}</span>
                        <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-accent'>
                          <span>+{gain} XP</span>
                        </span>
                      </div>
                      <div className='mt-1 flex items-center justify-between text-[10px] text-txt-muted'>
                        <span>{tr('主练')} {tr(ATTRIBUTE_LABEL[drill.focus])}</span>
                        <span>{drill.cost} {tr('金币')}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {coins < Math.min(...TRAINING_DRILLS.map((drill) => drill.cost)) ? (
                <p className='rounded-lg border border-danger/30 bg-danger/10 px-2 py-1.5 text-[11px] text-danger'>
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
  );
}