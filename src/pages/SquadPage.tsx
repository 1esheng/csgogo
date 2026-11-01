import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eraser, MousePointerClick, Wand2 } from 'lucide-react';
import { COMBAT_ROLES, ROLE_LABEL } from '@/types';
import type { CardTemplate, CombatRole, MapId, OwnedCard } from '@/types';
import type { PlayerCardView } from '@/components/PlayerCard';
import { PlayerCard } from '@/components/PlayerCard';
import { Button, EmptyState, Panel, SectionTitle } from '@/components/ui';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { roleFit } from '@/engine/rating';
import { CardPicker } from '@/features/squad/CardPicker';
import { SlotTile } from '@/features/squad/SlotTile';
import { SquadAnalysis } from '@/features/squad/SquadAnalysis';
import { buildSlotInfos, cardViewOf } from '@/features/squad/squadModel';

interface BenchEntry {
  /** 同名卡张数。 */
  copies: number;
  card: OwnedCard;
  template: CardTemplate;
  view: PlayerCardView;
}

export function SquadPage() {
  const { tr } = useT();
  const cards = useGameStore((s) => s.cards);
  const squad = useGameStore((s) => s.squad);
  const customTemplates = useGameStore((s) => s.customTemplates);
  const customPlayers = useGameStore((s) => s.customPlayers);
  const templates = useGameStore((s) => s.templates);
  const players = useGameStore((s) => s.players);
  const squadRating = useGameStore((s) => s.squadRating);
  const assignSlot = useGameStore((s) => s.assignSlot);
  const setIGL = useGameStore((s) => s.setIGL);
  const autoFillSquad = useGameStore((s) => s.autoFillSquad);
  const toast = useGameStore((s) => s.toast);
  const navigate = useNavigate();

  const [mapId, setMapId] = useState<MapId>('Mirage');
  const [pickerRole, setPickerRole] = useState<CombatRole | null>(null);
  const [dropTarget, setDropTarget] = useState<CombatRole | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const templateMap = useMemo(() => templates(), [templates, customTemplates, customPlayers]);
  const playerMap = useMemo(() => players(), [players, customTemplates, customPlayers]);
  const breakdown = useMemo(
    () => squadRating(mapId),
    [squadRating, squad, cards, mapId, customTemplates, customPlayers],
  );

  const slotInfos = useMemo(
    () => buildSlotInfos({
      slots: breakdown.slots, cards, templates: templateMap, players: playerMap, igl: squad.igl, mapId,
    }),
    [breakdown, cards, templateMap, playerMap, squad.igl, mapId],
  );

  const bench = useMemo<BenchEntry[]>(() => {
    const fielded = new Set<string>();
    COMBAT_ROLES.forEach((role) => {
      const instanceId = squad.slots[role];
      if (instanceId) fielded.add(instanceId);
    });
    // 同名卡聚合：替补席每个选手只出现一行（展示星级/等级最高的那张），
    // 已被换上场的那张优先，避免"同一选手多行"的噪音。
    const byTemplate = new Map<string, typeof cards>();
    cards.forEach((card) => {
      const list = byTemplate.get(card.templateId) ?? [];
      list.push(card);
      byTemplate.set(card.templateId, list);
    });
    const entries: BenchEntry[] = [];
    byTemplate.forEach((list, templateId) => {
      const template = templateMap[templateId];
      if (!template) return;
      const fieldedCopy = list.find((c) => fielded.has(c.instanceId));
      const rep = fieldedCopy
        ?? [...list].sort((a, b) => (b.stars ?? 1) - (a.stars ?? 1) || b.level - a.level || b.xp - a.xp)[0];
      // 已经上场的选手不算替补（除非他还有别的空余卡可以换上场）
      if (fieldedCopy && list.length === 1) return;
      entries.push({
        card: rep,
        template,
        copies: list.length,
        view: cardViewOf(rep, template, playerMap[template.playerId]),
      });
    });
    return entries.sort((a, b) => b.view.ovr - a.view.ovr);
  }, [cards, squad.slots, templateMap, playerMap]);

  const iglFielded = squad.igl !== null && COMBAT_ROLES.some((role) => squad.slots[role] === squad.igl);

  const startBlockedReason = breakdown.filled < 5
    ? tr('还需补齐') + ' ' + (5 - breakdown.filled) + ' ' + tr('个位置才能开赛。')
    : null;

  function handleDrop(role: CombatRole) {
    const instanceId = dragId;
    setDropTarget(null);
    setDragId(null);
    if (!instanceId) return;
    const template = (() => {
      const card = cards.find((c) => c.instanceId === instanceId);
      return card ? templateMap[card.templateId] : undefined;
    })();
    const result = assignSlot(role, instanceId);
    if (!result.ok) {
      toast(result.error ?? tr('这张卡牌无法胜任该位置。'), 'error');
      return;
    }
    toast(
      (template ? playerMap[template.playerId]?.nickname ?? template.playerId : tr('选手')) + tr(' 已就位：') + tr(ROLE_LABEL[role]) + tr('。'),
      'success',
    );
  }

  function quickAssign(instanceId: string) {
    const card = cards.find((c) => c.instanceId === instanceId);
    const template = card ? templateMap[card.templateId] : undefined;
    if (!template) return;
    const open = COMBAT_ROLES.filter((role) => !squad.slots[role]);
    if (open.length === 0) {
      toast(tr('阵容已满——点击某个位置即可替换选手。'), 'error');
      return;
    }
    const best = open.reduce((current, candidate) => (
      roleFit(template, candidate) > roleFit(template, current) ? candidate : current
    ), open[0]);
    const result = assignSlot(best, instanceId);
    if (!result.ok) {
      toast(result.error ?? tr('这张卡牌无法胜任该位置。'), 'error');
      return;
    }
    toast((playerMap[template.playerId]?.nickname ?? template.playerId) + tr(' 进入首发 · ') + tr(ROLE_LABEL[best]) + tr('。'), 'success');
  }

  function clearLineup() {
    const filled = COMBAT_ROLES.some((role) => squad.slots[role] !== null);
    if (!filled) {
      toast(tr('阵容已经是空的。'), 'info');
      return;
    }
    COMBAT_ROLES.forEach((role) => { assignSlot(role, null); });
    if (squad.igl) setIGL(null);
    toast(tr('阵容已清空。'), 'info');
  }

  function clearSlot(role: CombatRole, wasIGL: boolean) {
    assignSlot(role, null);
    if (wasIGL) setIGL(null);
  }

  return (
    <div className='space-y-5'>
      <SectionTitle
        title={tr('阵容')}
        subtitle={tr('五个位置，一套体系。把卡牌拖到位置上，或点击位置从收藏中挑选。')}
        right={(
          <div className='flex flex-wrap items-center gap-2'>
            <Button size='sm' variant='outline' onClick={autoFillSquad}>
              <Wand2 size={14} /> {tr('自动填充')}
            </Button>
            <Button size='sm' variant='ghost' onClick={clearLineup}>
              <Eraser size={14} /> {tr('全部清空')}
            </Button>
          </div>
        )}
      />

      <div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_366px]'>
        <div className='space-y-5'>
          <Panel>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
              <div className='label-xs'>{tr('首发五人')}</div>
              <div className='text-[11px] text-txt-muted'>
                {breakdown.filled}/5 {tr('已就位')} · {tr('平均适配')} {breakdown.averageFit}%
              </div>
            </div>
            <div className='space-y-2'>
              {COMBAT_ROLES.map((role) => {
                const info = slotInfos[role];
                return (
                  <SlotTile
                    key={role}
                    slot={role}
                    info={info}
                    isDropTarget={dropTarget === role && dragId !== null}
                    onOpen={() => setPickerRole(role)}
                    onClear={() => clearSlot(role, info ? info.isIGL : false)}
                    onToggleIGL={() => {
                      if (!info) return;
                      setIGL(info.isIGL ? null : info.instanceId);
                    }}
                    onDragOver={() => setDropTarget(role)}
                    onDragLeave={() => setDropTarget((current) => (current === role ? null : current))}
                    onDrop={() => handleDrop(role)}
                  />
                );
              })}
            </div>
          </Panel>

          <Panel>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
              <div className='label-xs'>{tr('替补席')} · {bench.length} {tr('名可用')}</div>
              <div className='flex items-center gap-1 text-[11px] text-txt-muted'>
                <MousePointerClick size={12} /> {tr('拖到位置上，或点击自动分配')}
              </div>
            </div>
            {bench.length === 0 ? (
              <EmptyState
                title={tr('没有替补卡牌')}
                hint={tr('你拥有的卡牌都已上场，或收藏还是空的。开启卡包签下更多选手。')}
              />
            ) : (
              <div className='no-scrollbar flex gap-3 overflow-x-auto pb-2'>
                {bench.map((entry) => (
                  <div
                    key={entry.card.instanceId}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', entry.card.instanceId);
                      event.dataTransfer.effectAllowed = 'move';
                      setDragId(entry.card.instanceId);
                    }}
                    onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                    className='shrink-0 cursor-grab active:cursor-grabbing'
                  >
                    <PlayerCard
                      card={entry.view}
                      size='sm'
                      onClick={() => quickAssign(entry.card.instanceId)}
                      cornerLabel={entry.copies > 1
                        ? `×${entry.copies}`
                        : entry.template.primaryRole === entry.template.secondaryRole
                          ? undefined
                          : tr(ROLE_LABEL[entry.template.secondaryRole])}
                    />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <SquadAnalysis
          breakdown={breakdown}
          mapId={mapId}
          onMapChange={setMapId}
          onStartMatch={() => navigate('/match')}
          startBlockedReason={startBlockedReason}
          iglAssigned={squad.igl !== null}
          iglFielded={iglFielded}
        />
      </div>

      <CardPicker role={pickerRole} onClose={() => setPickerRole(null)} />
    </div>
  );
}