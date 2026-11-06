import React, { useMemo, useState } from 'react';
import { useT } from '@/hooks/useLang';
import clsx from 'clsx';
import { Search, UserMinus } from 'lucide-react';
import type { CardTemplate, CombatRole, OwnedCard } from '@/types';
import { COMBAT_ROLES, ROLE_LABEL, starsOf } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { Badge, Button, EmptyState, Input, Modal, Progress } from '@/components/ui';
import { RARITY_TABLE } from '@/data/config';
import { cardOVRForRole, roleFit } from '@/engine/rating';
import { Avatar } from '@/components/Avatar';

interface PickRow {
  card: OwnedCard;
  /** 同名卡张数（列表按选手聚合显示）。 */
  copies: number;
  template: CardTemplate;
  nickname: string;
  countryCode: string;
  fit: number;
  ovr: number;
  blocked: boolean;
}

function fitTone(fit: number): 'accent' | 'danger' | 'success' | 'blue' {
  if (fit >= 85) return 'success';
  if (fit >= 65) return 'blue';
  if (fit >= 45) return 'accent';
  return 'danger';
}

export function CardPicker({ role, onClose }: { role: CombatRole | null; onClose: () => void }) {
  const { tr } = useT();
  const cards = useGameStore((s) => s.cards);
  const squad = useGameStore((s) => s.squad);
  const customTemplates = useGameStore((s) => s.customTemplates);
  const customPlayers = useGameStore((s) => s.customPlayers);
  const templates = useGameStore((s) => s.templates);
  const players = useGameStore((s) => s.players);
  const assignSlot = useGameStore((s) => s.assignSlot);
  const toast = useGameStore((s) => s.toast);
  const [query, setQuery] = useState('');

  const occupied = role ? squad.slots[role] !== null : false;

  const rows = useMemo<PickRow[]>(() => {
    if (!role) return [];
    const tplMap = templates();
    const playerMap = players();
    const fieldedElsewhere = new Set<string>();
    COMBAT_ROLES.forEach((other) => {
      if (other === role) return;
      const instanceId = squad.slots[other];
      if (!instanceId) return;
      const card = cards.find((c) => c.instanceId === instanceId);
      const template = card ? tplMap[card.templateId] : undefined;
      if (template) fieldedElsewhere.add(template.playerId);
    });
    const needle = query.trim().toLowerCase();
    const built: PickRow[] = [];
    const currentId = role ? squad.slots[role] : null;
    // 同名卡聚合成一行：优先展示已在该位置的卡，否则展示星级/等级最高的那张
    const byTemplate = new Map<string, OwnedCard[]>();
    cards.forEach((card) => {
      const list = byTemplate.get(card.templateId) ?? [];
      list.push(card);
      byTemplate.set(card.templateId, list);
    });
    byTemplate.forEach((list, templateId) => {
      const template = tplMap[templateId];
      if (!template) return;
      const identity = playerMap[template.playerId];
      const nickname = identity ? identity.nickname : template.playerId;
      if (needle && !nickname.toLowerCase().includes(needle)) return;
      const rep = list.find((c) => c.instanceId === currentId)
        ?? [...list].sort((a, b) => starsOf(b) - starsOf(a) || b.level - a.level || b.xp - a.xp)[0];
      built.push({
        card: rep,
        copies: list.length,
        template,
        nickname,
        countryCode: identity ? identity.countryCode : '??',
        fit: roleFit(template, role),
        ovr: cardOVRForRole(template, rep.level, role, rep.stars ?? 1),
        blocked: fieldedElsewhere.has(template.playerId),
      });
    });
    return built.sort((a, b) => (b.fit - a.fit) || (b.ovr - a.ovr));
  }, [cards, role, squad.slots, templates, players, query, customTemplates, customPlayers]);

  function assign(instanceId: string) {
    if (!role) return;
    const result = assignSlot(role, instanceId);
    if (!result.ok) {
      toast(result.error ?? tr('这张卡牌无法胜任该位置。'), 'error');
      return;
    }
    onClose();
  }

  function clearSlot() {
    if (!role) return;
    assignSlot(role, null);
    onClose();
  }

  return (
    <Modal
      open={role !== null}
      onClose={onClose}
      wide
      title={role ? tr('选择') + tr(ROLE_LABEL[role]) : tr('选择选手')}
    >
      <div className='mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='relative flex-1'>
          <Search size={14} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted' />
          <Input value={query} onChange={setQuery} placeholder={tr('搜索你的收藏')} className='[&>input]:pl-8' />
        </div>
        {role && occupied ? (
          <Button size='sm' variant='danger' onClick={clearSlot}>
            <UserMinus size={14} /> {tr('从此位置移除')}
          </Button>
        ) : null}
      </div>

      <p className='mb-3 text-[12px] leading-relaxed text-txt-muted'>
        {tr('按每张卡牌在当前等级、当前')}{role ? tr(ROLE_LABEL[role]) : tr('位置')}{tr('下的适配度排序。同一名选手不能同时占据两个位置，不同赛季的版本视为同一名选手。')}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          title={cards.length === 0 ? tr('你的收藏是空的') : tr('没有符合条件的卡牌')}
          hint={cards.length === 0 ? tr('开启卡包签下第一位选手，然后组建阵容。') : tr('清空搜索框即可看到全部收藏。')}
        />
      ) : (
        <div className='max-h-[58vh] space-y-1.5 overflow-y-auto pr-1'>
          {rows.map((row) => {
            const rarity = RARITY_TABLE[row.template.rarity];
            return (
              <button
                key={row.card.instanceId}
                type='button'
                disabled={row.blocked}
                onClick={() => assign(row.card.instanceId)}
                className={clsx(
                  'focus-ring flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors',
                  row.blocked
                    ? 'cursor-not-allowed border-white/5 bg-ink-900/40 opacity-55'
                    : 'border-white/10 bg-ink-700/50 hover:border-accent/60 hover:bg-ink-700',
                )}
              >
                <Avatar
                  playerId={row.template.playerId}
                  nickname={row.nickname}
                  size={36}
                  accent={rarity.color}
                  shape='square'
                  className='shrink-0'
                />
                <span className='min-w-0 flex-1'>
                  <span className='flex items-center gap-1.5'>
                    <span className='truncate font-display text-[14px] font-semibold text-txt'>{row.nickname}</span>
                    <span className='rounded bg-black/40 px-1 py-0.5 text-[11px] font-semibold text-txt-muted'>
                      {row.countryCode}
                    </span>
                    <span className='text-[11px] font-semibold ' style={{ color: rarity.color }}>
                      {row.template.season}
                    </span>
                  </span>
                  <span className='mt-0.5 block text-[12px] text-txt-muted'>
                    {tr(ROLE_LABEL[row.template.primaryRole])} · {row.card.level} {tr('级')}
                  </span>
                </span>
                <span className='hidden w-28 shrink-0 sm:block'>
                  <Progress value={row.fit} tone={fitTone(row.fit)} height='h-1.5' />
                </span>
                <span className='w-10 shrink-0 text-right text-[12px] font-semibold text-txt-muted'>{row.fit}%</span>
                <span className='w-8 shrink-0 text-right font-display text-base font-semibold' style={{ color: rarity.color }}>
                  {row.ovr}
                </span>
                {(row.card.stars ?? 1) > 1 ? (
                  <span className='shrink-0 rounded bg-accent/15 px-1 text-[12px] font-semibold text-accent'>{row.card.stars}★</span>
                ) : null}
                {row.copies > 1 ? (
                  <span className='shrink-0 rounded bg-white/10 px-1 text-[12px] font-semibold text-txt-muted'>×{row.copies}</span>
                ) : null}
                {row.blocked ? <Badge tone='danger'>{tr('已上场')}</Badge> : null}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}