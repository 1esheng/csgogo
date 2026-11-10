import React, { useMemo, useState } from 'react';
import { Layers, Sparkles, Star } from 'lucide-react';
import clsx from 'clsx';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { RARITY_TABLE, STAR_CONFIG } from '@/data/config';
import { RARITIES, ROLE_LABEL, starsOf } from '@/types';
import type { CardTemplate, Rarity, Role } from '@/types';
import { cardOVR, effectiveAttributes } from '@/engine/rating';
import { Badge, Button, EmptyState, Input, Modal, Panel, Progress, SectionTitle, Select, Tabs } from '@/components/ui';
import { PlayerCard } from '@/components/PlayerCard';
import { CollectionPage } from '@/pages/CollectionPage';
import { CardDetailBody } from '@/components/CardDetail';
import { avatarCredit, playersWithAvatars } from '@/data/avatars';
import { LEGEND_GOLD, isLegend } from '@/data/legends';

type Tab = 'owned' | 'gallery' | 'fuse';

type SortKey = 'ovr-desc' | 'ovr-asc' | 'rarity-desc' | 'rarity-asc' | 'name-asc' | 'name-desc' | 'copies-desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'ovr-desc', label: '综合评分：高 → 低' },
  { value: 'ovr-asc', label: '综合评分：低 → 高' },
  { value: 'rarity-desc', label: '稀有度：高 → 低' },
  { value: 'rarity-asc', label: '稀有度：低 → 高' },
  { value: 'name-asc', label: '昵称排序 A–Z' },
  { value: 'name-desc', label: '昵称排序 Z–A' },
  { value: 'copies-desc', label: '拥有数量：多 → 少' },
];

const RARITY_RANK: Record<Rarity, number> = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };

export function GalleryPage() {
  const { tr, pick } = useT();
  const { t } = useT();
  const sortOptions = SORT_OPTIONS.map((o) => ({ ...o, label: tr(o.label) }));
  const cards = useGameStore((s) => s.cards);
  const templates = useGameStore((s) => s.templates());
  const nameOf = useGameStore((s) => s.nameOf);
  const identities = useGameStore((s) => s.players());
  const fuseCards = useGameStore((s) => s.fuseCards);
  const fuseAll = useGameStore((s) => s.fuseAll);
  const changePage = useGameStore((s) => s.toast);
  const [tab, setTab] = useState<Tab>('owned');
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState<'ALL' | Rarity>('ALL');
  const [role, setRole] = useState<'ALL' | Role>('ALL');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [detail, setDetail] = useState<CardTemplate | null>(null);
  const [sort, setSort] = useState<SortKey>('ovr-desc');
  const [fusableOnly, setFusableOnly] = useState(false);
  const [legendOnly, setLegendOnly] = useState(false);

  const byTemplate = useMemo(() => {
    const map = new Map<string, { count: number; best: number; level: number }>();
    cards.forEach((c) => {
      const prev = map.get(c.templateId);
      const stars = starsOf(c);
      map.set(c.templateId, {
        count: (prev?.count ?? 0) + 1,
        best: Math.max(prev?.best ?? 0, stars),
        level: Math.max(prev?.level ?? 0, c.level),
      });
    });
    return map;
  }, [cards]);

  const sorted = <T extends { template: CardTemplate }>(items: T[]): T[] => {
    const val = (x: T) => x.template;
    const copyCount = (id: string) => byTemplate.get(id)?.count ?? 0;
    const list = [...items];
    switch (sort) {
      case 'ovr-asc': return list.sort((a, b) => cardOVR(val(a), 1) - cardOVR(val(b), 1));
      case 'rarity-desc': return list.sort((a, b) => RARITY_RANK[val(b).rarity] - RARITY_RANK[val(a).rarity] || cardOVR(val(b), 1) - cardOVR(val(a), 1));
      case 'rarity-asc': return list.sort((a, b) => RARITY_RANK[val(a).rarity] - RARITY_RANK[val(b).rarity] || cardOVR(val(a), 1) - cardOVR(val(b), 1));
      case 'name-asc': return list.sort((a, b) => nameOf(val(a).playerId).localeCompare(nameOf(val(b).playerId), 'zh-Hans'));
      case 'name-desc': return list.sort((a, b) => nameOf(val(b).playerId).localeCompare(nameOf(val(a).playerId), 'zh-Hans'));
      case 'copies-desc': return list.sort((a, b) => copyCount(val(b).id) - copyCount(val(a).id));
      default: return list.sort((a, b) => cardOVR(val(b), 1) - cardOVR(val(a), 1));
    }
  };

  const all = useMemo(() => Object.values(templates), [templates]);
  const filtered = useMemo(() => all
    .filter((t) => {
      const owned = byTemplate.get(t.id);
      if (ownedOnly && !owned) return false;
      if (rarity !== 'ALL' && t.rarity !== rarity) return false;
      // 「传奇」只是标签，与稀有度筛选叠加，不改变任何稀有度本身。
      if (legendOnly && !isLegend(t.playerId)) return false;
      if (role !== 'ALL' && t.primaryRole !== role && t.secondaryRole !== role) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const nick = nameOf(t.playerId).toLowerCase();
        if (!nick.includes(q) && !t.playerId.includes(q)) return false;
      }
      return true;
    })
    .map((template) => ({ template })),
  [all, byTemplate, rarity, role, query, ownedOnly, nameOf, legendOnly]);

  const fusionTargets = useMemo(() => all
    .map((t) => ({ template: t, owned: byTemplate.get(t.id) }))
    .filter((x) => x.owned && x.owned.count >= 2)
    .sort((a, b) => (b.owned?.count ?? 0) - (a.owned?.count ?? 0)),
  [all, byTemplate]);

  const fusableCount = fusionTargets.filter((x) => (x.owned?.count ?? 0) >= STAR_CONFIG.copiesRequired && (x.owned?.best ?? 1) < STAR_CONFIG.maxStars).length;
  const legendCount = useMemo(() => all.filter((t) => isLegend(t.playerId)).length, [all]);
  const ownedCount = byTemplate.size;
  const withPhoto = playersWithAvatars().length;

  const handleFuse = (t: CardTemplate) => {
    const res = fuseCards(t.id);
    if (!res.ok && res.error) changePage(res.error, 'error');
  };

  return (
    <div className='space-y-5'>
      <SectionTitle
        title={t('page.gallery.title')}
        subtitle={`${tr('全部')} ${all.length} ${tr('名选手')} · ${tr('已收集')} ${ownedCount}${tr(' 名 · 已有照片')} ${withPhoto}${tr(' 张')}`}
        right={<Tabs tabs={[{ id: 'owned', label: tr('我的卡牌') }, { id: 'gallery', label: tr('全部图鉴') }, { id: 'fuse', label: tr('卡牌合成') }]} active={tab} onChange={(id) => setTab(id as Tab)} />}
      />

      <div key={tab} data-tab-panel className='animate-fade-up space-y-5'>
      {tab === 'owned' ? (
        <CollectionPage embedded />
      ) : tab === 'gallery' ? (
        <Panel>
          <div className='mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <Input value={query} onChange={setQuery} placeholder={tr('搜索选手昵称…')} />
            <Select
              value={rarity}
              onChange={(v) => setRarity(v as 'ALL' | Rarity)}
              options={[{ value: 'ALL', label: tr('全部稀有度') }, ...RARITIES.map((r) => ({ value: r, label: tr(RARITY_TABLE[r].label) }))]}
            />
            <Select
              value={role}
              onChange={(v) => setRole(v as 'ALL' | Role)}
              options={[{ value: 'ALL', label: tr('全部位置') }, ...(['AWPer', 'Entry', 'Lurker', 'Support', 'Anchor', 'IGL'] as Role[]).map((r) => ({ value: r, label: tr(ROLE_LABEL[r]) }))]}
            />
            <Button variant={ownedOnly ? 'primary' : 'ghost'} onClick={() => setOwnedOnly((v) => !v)}>
              <Layers size={14} /> {ownedOnly ? tr('只看已拥有') : tr('显示全部')}
            </Button>
            <button
              type='button'
              data-legend-filter='1'
              aria-pressed={legendOnly}
              onClick={() => setLegendOnly((v) => !v)}
              title={tr('只看传奇')}
              className={clsx(
                'focus-ring rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-colors duration-150',
                legendOnly ? 'text-ink-900' : 'text-txt-muted hover:text-txt',
              )}
              style={legendOnly
                ? { background: LEGEND_GOLD, borderColor: LEGEND_GOLD }
                : { borderColor: 'rgba(216,178,106,0.4)', background: 'rgba(216,178,106,0.08)' }}
            >
              {pick(tr('传奇'), 'LEGEND')}
              <span className={legendOnly ? 'ml-1 text-ink-900/70' : 'ml-1 text-txt-muted'}>{legendCount}</span>
            </button>
            <Select value={sort} onChange={(v) => setSort(v as SortKey)} options={sortOptions} />
          </div>
          {filtered.length === 0 ? (
            <EmptyState title={tr('没有符合条件的选手')} hint={tr('换个筛选条件，或先去卡包抽几张。')} />
          ) : (
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'>
              {sorted(filtered).map(({ template: t }) => {
                const owned = byTemplate.get(t.id);
                const c = avatarCredit(t.playerId);
                return (
                  <div key={t.id} className='space-y-1'>
                    <PlayerCard
                      card={{ template: t, nickname: nameOf(t.playerId), countryCode: identities[t.playerId]?.countryCode ?? '', ovr: cardOVR(t, owned?.level ?? 1, owned?.best ?? 1), level: owned?.level ?? 1, stars: owned?.best ?? 1 }}
                      size='sm'
                      dimmed={!owned}
                      onClick={() => setDetail(t)}
                    />
                    {c ? <div className='truncate text-[12px] text-txt-muted'>{tr('图源')} {c.source}</div> : null}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      ) : (
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'>
          <Panel>
            <SectionTitle
              title={tr('卡牌合成')}
              subtitle={`${STAR_CONFIG.copiesRequired} ${tr('张同名卡合成 1 星，每星全能力 +')}${STAR_CONFIG.bonusPerStar}${tr('，星级不设上限。当前 ')}${fusionTargets.length} ${tr('个可合成/待凑齐的选手。')}`}
              right={
                <div className='flex flex-wrap items-center gap-2'>
                  <Button size='sm' disabled={fusableCount === 0} onClick={() => fuseAll()}>
                    <Sparkles size={13} /> {tr('一键升星')}{fusableCount > 0 ? `（${fusableCount}）` : ''}
                  </Button>
                  <Button size='sm' variant={fusableOnly ? 'primary' : 'ghost'} onClick={() => setFusableOnly((v) => !v)}>
                    <Sparkles size={13} /> {tr('仅显示可升星')}{fusableOnly ? ' ✓' : ''}
                  </Button>
                  <Select value={sort} onChange={(v) => setSort(v as SortKey)} options={sortOptions} className='w-52' />
                </div>
              }
            />
            {fusionTargets.length === 0 ? (
              <EmptyState title={tr('暂时没有可合成的重复卡')} hint={tr('抽到重复卡片后，这里会出现升星按钮。')} />
            ) : (
              <div className='space-y-2'>
                {sorted(fusableOnly ? fusionTargets.filter((x) => (x.owned?.count ?? 0) >= STAR_CONFIG.copiesRequired && (x.owned?.best ?? 1) < STAR_CONFIG.maxStars) : fusionTargets).map(({ template, owned }) => {
                  const count = owned?.count ?? 0;
                  const stars = owned?.best ?? 1;
                  const canFuse = count >= STAR_CONFIG.copiesRequired;
                  const now = cardOVR(template, owned?.level ?? 1, stars);
                  const next = cardOVR(template, owned?.level ?? 1, stars + 1);
                  return (
                    <div key={template.id} className='flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2'>
                      <PlayerCard
                        card={{ template, nickname: nameOf(template.playerId), countryCode: identities[template.playerId]?.countryCode ?? '', ovr: now, level: owned?.level ?? 1, stars }}
                        size='sm'
                        onClick={() => setDetail(template)}
                      />
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='truncate font-display text-[15px] font-semibold'>{nameOf(template.playerId)}</span>
                          <Badge tone='muted'>{tr(RARITY_TABLE[template.rarity].label)}</Badge>
                          <span className='inline-flex items-center gap-0.5 text-[13px] text-accent'>
                            {Array.from({ length: stars }).map((_x, i) => <Star key={i} size={11} fill='currentColor' />)}
                          </span>
                        </div>
                        <div className='mt-1 flex items-center gap-2 text-[12px] text-txt-muted'>
                          <span>{tr('拥有')} {count}{tr(' 张')}</span>
                          <span>·</span>
                          <span>{tr('当前')} {now} {tr('评分')}</span>
                          {canFuse ? <span className='text-emerald-300'>→ {next}</span> : null}
                        </div>
                        <div className='mt-1'><Progress value={Math.min(count, STAR_CONFIG.copiesRequired)} max={STAR_CONFIG.copiesRequired} height='h-1.5' /></div>
                      </div>
                      <Button size='sm' disabled={!canFuse} onClick={() => handleFuse(template)}>
                        <Sparkles size={13} /> {canFuse ? tr('升星') : `${tr('还差')} ${STAR_CONFIG.copiesRequired - count}${tr(' 张')}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
          <Panel>
            <SectionTitle title={tr('合成规则')} />
            <ul className='space-y-2 text-[13px] leading-relaxed text-txt-muted'>
              <li>· {STAR_CONFIG.copiesRequired} {tr('张同名卡（同一选手同赛季版本）→ 升 1 星')}</li>
              <li>· {tr('每升 1 星，8 项能力全部 +')}{STAR_CONFIG.bonusPerStar}{tr('，**属性上限同步提高 ')}{STAR_CONFIG.bonusPerStar}{tr('**（基础 99），所以 5 星强者会明显强于低星')}</li>
              <li>{tr('· 星级没有上限；保留等级/经验最高的那一张，其余被消耗')}</li>
              <li>{tr('· 若被消耗的卡在首发阵容里，位置会自动切到保留下来的那张')}</li>
              <li>{tr('· 升星同时提升 10 点精通')}</li>
            </ul>
          </Panel>
        </div>
      )}

      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? nameOf(detail.playerId) : ''} wide>
        {detail ? (
          <CardDetailBody
            template={detail}
            nickname={nameOf(detail.playerId)}
            countryCode={detail ? identities[detail.playerId]?.countryCode ?? '' : ''}
            ovr={cardOVR(detail, byTemplate.get(detail.id)?.level ?? 1, byTemplate.get(detail.id)?.best ?? 1)}
            level={byTemplate.get(detail.id)?.level ?? 1}
            stars={byTemplate.get(detail.id)?.best ?? 1}
            xpPct={0}
            xpLabel={`${effectiveAttributes(detail, byTemplate.get(detail.id)?.level ?? 1, byTemplate.get(detail.id)?.best ?? 1).aim} ${tr('枪法')}`}
          />
        ) : null}
      </Modal>
    </div>
  );
}