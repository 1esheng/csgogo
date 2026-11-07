import React from 'react';
import clsx from 'clsx';
import { logoFor } from '@/data/teamLogos';
import brandMark from '@/assets/brand/icon-dark.png';
import { useT } from '@/hooks/useLang';

/** 队名首字母：取第一个字母或数字，'9z Team' → '9'，'MOUZ' → 'M'。 */
function initial(name: string): string {
  const clean = name.replace(/^[^A-Za-z0-9\u4e00-\u9fa5]+/, '');
  return (clean.slice(0, 1) || 'C').toUpperCase();
}

/**
 * 战队队标：有本地 LOGO 就显示图片；没有（自建俱乐部、未收录的队）时渲染首字母方标，
 * 保证每一行高度一致，也不会拿别的队的图凑数。
 */
export function TeamLogo({
  teamId, name, size = 22, className,
}: {
  teamId?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const { tr } = useT();
  // 玩家自建俱乐部没有真实队标，用本作品牌标志；其余缺图走首字母方标
  const src = !teamId || teamId === 'player' ? brandMark : logoFor(teamId);
  const label = tr('队标');

  if (src) {
    return (
      <img
        src={src}
        alt={label + ' ' + name}
        title={name}
        width={size}
        height={size}
        loading='lazy'
        draggable={false}
        className={clsx('shrink-0 rounded object-contain', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      role='img'
      aria-label={label + ' ' + name}
      title={name}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded border border-white/10 bg-ink-700 font-display font-semibold text-txt-muted',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.5)) }}
    >
      {initial(name)}
    </span>
  );
}
