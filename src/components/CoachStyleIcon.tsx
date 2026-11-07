import React from 'react';
import clsx from 'clsx';

/**
 * 执教风格图标：四种收益维度各一个几何图标，全部内联 SVG 绘制。
 * 统一 1.5px 线宽、纯 currentColor、无填充——配色完全交给调用方。
 */

export const COACH_STYLE_KINDS = ['attribute', 'training', 'economy', 'debuff'] as const;
export type CoachStyleKind = (typeof COACH_STYLE_KINDS)[number];

/** 图标对应的中文风格名，调用方按需 tr()。 */
export const COACH_STYLE_LABEL: Record<CoachStyleKind, string> = {
  attribute: '属性',
  training: '训练',
  economy: '经济',
  debuff: '削弱对手',
};

/** 教练数据里的中文风格 → 图标维度（口径与 engine/coach.ts 的收益一致）。 */
export function coachStyleKind(style: string): CoachStyleKind {
  switch (style) {
    case '培养':
      return 'training';
    case '执教纪律':
      return 'economy';
    case '战术':
    case '临场':
      return 'debuff';
    default:
      return 'attribute';
  }
}

const SHAPES: Record<CoachStyleKind, React.ReactNode> = {
  /* 属性：六边形 + 中轴，像一张能力面板。 */
  attribute: (
    <>
      <polygon points='12,3.2 19.6,7.6 19.6,16.4 12,20.8 4.4,16.4 4.4,7.6' />
      <path d='M12 8.4v7.2' />
    </>
  ),
  /* 训练：三根阶梯柱，底边对齐。 */
  training: (
    <>
      <path d='M5 19.4V13.2' />
      <path d='M12 19.4V9.4' />
      <path d='M19 19.4V5.2' />
    </>
  ),
  /* 经济：钞票外框 + 中间一枚币。 */
  economy: (
    <>
      <rect x='3.2' y='6.6' width='17.6' height='10.8' rx='1.6' />
      <circle cx='12' cy='12' r='2.6' />
    </>
  ),
  /* 削弱对手：下压箭头撞到一条横线。 */
  debuff: (
    <>
      <path d='M12 3.6v10.4' />
      <path d='M8 10.6l4 4 4-4' />
      <path d='M5 19.6h14' />
    </>
  ),
};

export function CoachStyleIcon({
  kind, size = 16, className, title,
}: {
  kind: CoachStyleKind;
  /** 两档尺寸，避免调用方随手写别的 px。 */
  size?: 16 | 20;
  className?: string;
  /** 传了标题就作为有语义的图形暴露给读屏；不传视为装饰（旁边已有文字）。 */
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={clsx('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {SHAPES[kind]}
    </svg>
  );
}
