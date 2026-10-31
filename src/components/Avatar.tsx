import React from 'react';
import clsx from 'clsx';
import { avatarFor } from '@/data/avatars';

function initials(nickname: string): string {
  const clean = nickname.replace(/[^A-Za-z0-9\u4e00-\u9fa5]/g, '');
  return clean.slice(0, 2).toUpperCase() || 'CS';
}

function hashHue(playerId?: string | null, fallback = ''): number {
  const key = (playerId ?? '') + fallback;
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 360;
}

/**
 * 头像组件：有本地真实照片就显示照片；没有照片（例如 AI 阵容里的通用选手）时，
 * 生成一张确定性的「选手剪影 + 昵称首字母」占位头像，保证每张卡都有头像且不会冒用他人照片。
 */
export function Avatar({
  playerId, nickname, size = 64, accent = '#4FA3F7', shape = 'circle', className, title,
}: {
  playerId?: string | null;
  nickname: string;
  size?: number;
  accent?: string;
  shape?: 'circle' | 'square';
  className?: string;
  title?: string;
}) {
  const src = avatarFor(playerId);
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  if (src) {
    return (
      <img
        src={src}
        alt={nickname}
        title={title ?? nickname}
        width={size}
        height={size}
        loading='lazy'
        className={clsx('border border-white/15 object-cover object-top', radius, className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const hue = hashHue(playerId, nickname);
  const gradientId = 'av' + hue + Math.round(size);
  return (
    <div
      title={title ?? nickname}
      className={clsx('relative overflow-hidden border border-white/15', radius, className)}
      style={{ width: size, height: size, background: 'linear-gradient(155deg, hsl(' + hue + ' 46% 26%), rgba(11,14,19,0.95))' }}
    >
      <svg viewBox='0 0 64 64' width={size} height={size} className='absolute inset-0'>
        <defs>
          <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor={'hsl(' + hue + ' 62% 62%)'} stopOpacity='0.95' />
            <stop offset='100%' stopColor={'hsl(' + ((hue + 40) % 360) + ' 55% 42%)'} stopOpacity='0.55' />
          </linearGradient>
        </defs>
        <circle cx='32' cy='23' r='11' fill={'url(#' + gradientId + ')'} />
        <path d='M8 62c2.6-13.4 12-20.4 24-20.4S53.4 48.6 56 62Z' fill={'url(#' + gradientId + ')'} />
      </svg>
      <span
        className='absolute inset-x-0 bottom-[6%] text-center font-display font-black tracking-tight text-white/90'
        style={{ fontSize: Math.max(9, Math.round(size * 0.24)), textShadow: '0 1px 3px rgba(0,0,0,0.55)' }}
      >
        {initials(nickname)}
      </span>
    </div>
  );
}