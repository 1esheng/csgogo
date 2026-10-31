import React from 'react';
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
  if (!item) return null;
  const xp = xpProgress(item.xp);
  const maxLevel = xp.level >= LEVEL_CONFIG.maxLevel;
  const xpLabel = maxLevel
    ? '已达最高等级'
    : xp.current + ' / ' + xp.required + ' 经验，距 ' + (xp.level + 1) + ' 级';

  return (
    <Modal open onClose={onClose} title={item.nickname} wide>
      <div className='mb-4 flex flex-wrap items-center gap-2'>
        <Badge tone='accent'>{ROLE_LABEL[item.template.primaryRole]}</Badge>
        {item.template.secondaryRole !== item.template.primaryRole ? (
          <Badge tone='neutral'>副位：{ROLE_LABEL[item.template.secondaryRole]}</Badge>
        ) : null}
        <Badge tone='muted'>已拥有 {item.copies} 张</Badge>
        {item.squadRole ? <Badge tone='success'>首发：{ROLE_LABEL[item.squadRole]}</Badge> : null}
        {item.isIGL ? <Badge tone='success'>队内指挥</Badge> : null}
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
              <div className='label-xs mb-2'>指派位置（显示位置适配度）</div>
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
                      title={'将 ' + item.nickname + ' 指派到 ' + ROLE_LABEL[role] + '（适配 ' + fit + '）'}
                    >
                      {ROLE_LABEL[role]}
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
                title='指挥影响默契与回合内决策'
              >
                {item.isIGL ? '已设为队内指挥' : '设为队内指挥'}
              </Button>
              <span className='text-[11px] text-txt-muted'>
                每张卡牌独立升级；三张同名卡可在「选手图鉴 → 卡牌合成」升星，每星全能力 +3。
              </span>
            </div>
          </div>
        }
      />
    </Modal>
  );
}