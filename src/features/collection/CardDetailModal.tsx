import React from 'react';
import { useT } from '@/hooks/useLang';
import { Badge, Button, Divider, Modal } from '@/components/ui';
import { CardDetailBody } from '@/components/CardDetail';
import { roleFit, xpProgress } from '@/engine/rating';
import { LEVEL_CONFIG } from '@/data/config';
import { COMBAT_ROLES, ROLE_LABEL } from '@/types';
import type { CombatRole } from '@/types';
import type { CollectionItem } from './collectionModel';

export function CardDetailModal({
  item, onClose, onAssign, onSetIGL,
}: {
  item: CollectionItem | null;
  onClose: () => void;
  onAssign: (role: CombatRole) => void;
  onSetIGL: () => void;
}) {
  const { tr } = useT();
  if (!item) return null;
  const xp = xpProgress(item.xp);
  const maxLevel = xp.level >= LEVEL_CONFIG.maxLevel;
  const xpLabel = maxLevel
    ? tr('已达最高等级')
    : xp.current + ' / ' + xp.required + ' ' + tr('经验，距') + ' ' + (xp.level + 1) + tr(' 级');

  return (
    <Modal open onClose={onClose} title={item.nickname} wide>
      <div className='mb-4 flex flex-wrap items-center gap-2'>
        <Badge tone='accent'>{tr(ROLE_LABEL[item.template.primaryRole])}</Badge>
        {item.template.secondaryRole !== item.template.primaryRole ? (
          <Badge tone='neutral'>{tr('副位：')}{tr(ROLE_LABEL[item.template.secondaryRole])}</Badge>
        ) : null}
        <Badge tone='muted'>{tr('已拥有')} {item.copies}{tr(' 张')}</Badge>
        {item.squadRole ? <Badge tone='success'>{tr('首发：')}{tr(ROLE_LABEL[item.squadRole])}</Badge> : null}
        {item.isIGL ? <Badge tone='success'>{tr('队内指挥')}</Badge> : null}
      </div>

      <CardDetailBody
        template={item.template}
        nickname={item.nickname}
        countryCode={item.countryCode}
        ovr={item.ovr}
        level={item.level}
            stars={item.stars}
        xpPct={xp.pct}
        xpLabel={xpLabel}
        actions={
          <div className='w-full space-y-4'>
            <div>
              <div className='label-xs mb-2'>{tr('指派位置（显示位置适配度）')}</div>
              <div className='flex flex-wrap gap-2'>
                {COMBAT_ROLES.map((role) => {
                  const fit = roleFit(item.template, role);
                  const current = item.squadRole === role;
                  return (
                    <Button
                      key={role}
                      size='sm'
                      variant={current ? 'primary' : 'outline'}
                      onClick={() => onAssign(role)}
                      title={tr('将') + ' ' + item.nickname + ' ' + tr('指派到') + ' ' + tr(ROLE_LABEL[role]) + '（' + tr('适配') + ' ' + fit + '）'}
                    >
                      {tr(ROLE_LABEL[role])}
                      <span className={current ? 'text-ink-900/70' : 'text-txt-muted'}>{fit}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
            <Divider />
            <div className='flex flex-wrap items-center gap-3'>
              <Button
                size='sm'
                variant={item.isIGL ? 'primary' : 'ghost'}
                onClick={onSetIGL}
                title={tr('指挥影响默契与回合内决策')}
              >
                {item.isIGL ? tr('已设为队内指挥') : tr('设为队内指挥')}
              </Button>
              <span className='text-[11px] text-txt-muted'>
                {tr('每张卡牌独立升级；三张同名卡可在「选手图鉴 → 卡牌合成」升星，每星全能力 +3。')}
              </span>
            </div>
          </div>
        }
      />
    </Modal>
  );
}