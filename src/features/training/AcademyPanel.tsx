import React, { useState } from 'react';
import { useT } from '@/hooks/useLang';
import { ArrowUpRight, GraduationCap, Radar, ShieldAlert, Trash2 } from 'lucide-react';
import type { Prospect } from '@/types';
import { ROLE_LABEL } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { Badge, Button, EmptyState, Panel, Progress } from '@/components/ui';
import { PROSPECT_CONFIG } from '@/data/config';
import { PROSPECT_TRAIT_NAME_EN } from '@/data/cards';
import { initials, relativeTime } from '@/features/training/format';

function ProspectCard({
  prospect, confirming, onPromote, onRelease, onConfirm,
}: {
  prospect: Prospect;
  confirming: boolean;
  onPromote: () => void;
  onRelease: () => void;
  onConfirm: () => void;
}) {
  const { tr, pick } = useT();
  return (
    <div className='surface-raised flex flex-col gap-2.5 p-3'>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-gradient-to-br from-accent/40 to-ink-900 font-display text-[12px] font-semibold text-white/90'>
            {initials(prospect.nickname)}
          </span>
          <div className='min-w-0'>
            <div className='truncate font-display text-[15px] font-semibold text-txt'>{prospect.nickname}</div>
            <div className='text-[12px] text-txt-muted'>
              {prospect.countryCode} · {prospect.age} {tr('岁')} · {tr(ROLE_LABEL[prospect.primaryRole])}
            </div>
          </div>
        </div>
        <div className='shrink-0 text-right'>
          <div className='font-display text-xl font-semibold leading-none text-accent'>{prospect.ovr}</div>
          <div className='text-[11px] font-semibold text-txt-muted'>
            {tr('潜力')} {prospect.potential}
          </div>
        </div>
      </div>

      <div>
        <Progress value={prospect.ovr} max={Math.max(1, prospect.potential)} tone='accent' height='h-1.5' />
        <div className='mt-1 flex items-center justify-between text-[12px] text-txt-muted'>
          <span>{tr('当前')} {prospect.ovr} / {tr('上限')} {prospect.potential}</span>
          <span>{tr('成长倍率')} ×{prospect.growthRate.toFixed(2)}</span>
        </div>
      </div>

      <div className='flex flex-wrap gap-1'>
        {prospect.traits.map((trait) => (
          <Badge key={trait} tone='neutral'>{pick(trait, PROSPECT_TRAIT_NAME_EN[trait] ?? trait)}</Badge>
        ))}
        <Badge tone='muted'>{tr(ROLE_LABEL[prospect.secondaryRole])} {tr('副位')}</Badge>
      </div>

      <div className='mt-auto flex items-center gap-2'>
        <Button size='sm' className='flex-1' onClick={onPromote}>
          <ArrowUpRight size={13} /> {tr('提拔')}
        </Button>
        {confirming ? (
          <Button size='sm' variant='danger' onClick={onConfirm}>
            <Trash2 size={13} /> {tr('确认')}
          </Button>
        ) : (
          <Button size='sm' variant='outline' onClick={onRelease} title={tr('从青训营释放')}>
            {tr('释放')}
          </Button>
        )}
      </div>
      <div className='text-[12px] text-txt-muted'>{tr('发掘于')} {relativeTime(prospect.createdAt)}</div>
    </div>
  );
}

export function AcademyPanel() {
  const { tr } = useT();
  const prospects = useGameStore((s) => s.prospects);
  const coins = useGameStore((s) => s.club.coins);
  const scoutProspect = useGameStore((s) => s.scoutProspect);
  const promoteProspect = useGameStore((s) => s.promoteProspect);
  const releaseProspect = useGameStore((s) => s.releaseProspect);
  const toast = useGameStore((s) => s.toast);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const academy = prospects.filter((p) => p.status === 'academy');
  const promoted = prospects.filter((p) => p.status === 'promoted');
  const full = academy.length >= PROSPECT_CONFIG.maxProspects;
  const affordable = coins >= PROSPECT_CONFIG.scoutCost;
  const scoutBlurb = tr('一次球探花费 ') + PROSPECT_CONFIG.scoutCost
    + tr(' 金币，带回 1 名 16-19 岁的待签约选手，综合 ')
    + PROSPECT_CONFIG.minOvr + '-' + PROSPECT_CONFIG.maxOvr
    + tr('，潜力上限 ') + PROSPECT_CONFIG.minPotential + '-' + PROSPECT_CONFIG.maxPotential
    + tr('。青训营容量为 ') + PROSPECT_CONFIG.maxProspects + tr(' 名选手。');

  const blockedReason = full
    ? tr('青训营已满（') + academy.length + '/' + PROSPECT_CONFIG.maxProspects + tr('）——请先提拔或释放一名选手。')
    : !affordable
      ? tr('需要 ') + PROSPECT_CONFIG.scoutCost + tr(' 金币才能派出球探。')
      : null;

  function scout() {
    const result = scoutProspect();
    if (!result.ok) toast(result.error ?? tr('球探行动失败。'), 'error');
  }

  function promote(id: string) {
    const result = promoteProspect(id);
    if (!result.ok) toast(result.error ?? tr('提拔失败。'), 'error');
    else setConfirmId(null);
  }

  function release(id: string) {
    releaseProspect(id);
    setConfirmId(null);
    toast(tr('该选手已被移出青训营。'), 'info');
  }

  return (
    <div className='space-y-5'>
      <Panel>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='min-w-0'>
            <div className='flex items-center gap-1.5'>
              <Radar size={14} className='text-accent' />
              <span className='label-xs'>{tr('球探网络')}</span>
            </div>
            <p className='mt-1.5 max-w-xl text-[13px] leading-relaxed text-txt-muted'>{scoutBlurb}</p>
            <div className='mt-2 flex flex-wrap items-center gap-2'>
              <Badge tone={full ? 'danger' : 'neutral'}>
                {tr('青训营')} {academy.length}/{PROSPECT_CONFIG.maxProspects}
              </Badge>
              <Badge tone='muted'>{tr('花费')} {PROSPECT_CONFIG.scoutCost}</Badge>
            </div>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <Button disabled={blockedReason !== null} title={blockedReason ?? tr('派出球探')} onClick={scout}>
              <Radar size={14} /> {tr('派遣球探')}
            </Button>
            {blockedReason ? <span className='max-w-[240px] text-right text-[12px] text-txt-muted'>{blockedReason}</span> : null}
          </div>
        </div>
      </Panel>

      {academy.length === 0 ? (
        <Panel>
          <EmptyState
            title={tr('青训营里还没有选手')}
            hint={tr('派出球探去寻找年轻选手。提拔后的选手会以收藏卡牌的形式进入你的收藏。')}
          />
        </Panel>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          {academy.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              confirming={confirmId === prospect.id}
              onPromote={() => promote(prospect.id)}
              onRelease={() => setConfirmId(prospect.id)}
              onConfirm={() => release(prospect.id)}
            />
          ))}
        </div>
      )}

      {promoted.length > 0 ? (
        <Panel>
          <div className='mb-2 flex items-center gap-1.5'>
            <GraduationCap size={13} className='text-accent' />
            <span className='label-xs'>{tr('已毕业入队')} · {promoted.length}</span>
          </div>
          <ul className='space-y-1'>
            {promoted.map((prospect) => (
              <li key={prospect.id} className='flex items-center gap-2 rounded-lg border border-white/5 bg-ink-900/50 px-2.5 py-1.5'>
                <span className='min-w-0 flex-1 truncate text-[13px] text-txt'>{prospect.nickname}</span>
                <span className='text-[12px] text-txt-muted'>{tr(ROLE_LABEL[prospect.primaryRole])}</span>
                <Badge tone='success'>{tr('已入收藏')}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel>
        <div className='flex items-start gap-2'>
          <ShieldAlert size={14} className='mt-0.5 shrink-0 text-accent' />
          <div className='space-y-1 text-[12px] leading-relaxed text-txt-muted'>
            <p className='font-semibold text-accent'>{tr('潜力是上限，不是保证')}</p>
            <p>
              {tr('球探给出的潜力数值是这名选手能达到的上限，提拔并不会直接把潜力兑现。提拔后的卡牌保留自己的成长倍率，因此永久属性点累积缓慢，并且受等级系统限制（5 级、8 点基础点、每项属性 99）——这就是为什么没有任何卡牌可以单纯靠升级刷到 99。')}
            </p>
            <p>{tr('被释放的选手会永久移出青训营，无法找回。')}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
