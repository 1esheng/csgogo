import type { TrainingRecord } from '@/types';

export function initials(nickname: string): string {
  const clean = nickname.replace(/[^A-Za-z0-9]/g, '');
  return clean.slice(0, 2).toUpperCase() || 'CS';
}

export function relativeTime(at: number): string {
  const minutes = Math.floor((Date.now() - at) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + ' 分钟前';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' 小时前';
  const days = Math.floor(hours / 24);
  return days + ' 天前';
}

export const TRAINING_KIND_LABEL: Record<TrainingRecord['kind'], string> = {
  drill: '专项训练',
  scrim: '训练赛',
  match: '实战磨合',
  mastery: '精通',
};
