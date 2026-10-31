import creditsRaw from '@/assets/avatars/credits.json';

/**
 * 选手头像：把图片放进 src/assets/avatars/，文件名用 playerId（见 data/cards.ts 的 PLAYERS）。
 * 构建时会被 Vite 打包成本地资源，因此断网也能显示；没有对应文件时自动回退到首字母卡面。
 */
const modules = import.meta.glob('../assets/avatars/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface AvatarCredit {
  file?: string;
  source?: string;
  note?: string;
}

const credits = creditsRaw as unknown as Record<string, AvatarCredit>;

const byPlayerId: Record<string, string> = {};
Object.entries(modules).forEach(([path, url]) => {
  const file = path.split('/').pop() ?? '';
  const id = file.replace(/\.[^.]+$/, '').toLowerCase();
  if (id) byPlayerId[id] = url;
});

export function avatarFor(playerId?: string | null): string | null {
  if (!playerId) return null;
  return byPlayerId[playerId.toLowerCase()] ?? null;
}

export function avatarCredit(playerId?: string | null): AvatarCredit | null {
  if (!playerId) return null;
  const entry = credits[playerId.toLowerCase()];
  if (!entry || typeof entry !== 'object') return null;
  return entry;
}

export function avatarCount(): number {
  return Object.keys(byPlayerId).length;
}

export function playersWithAvatars(): string[] {
  return Object.keys(byPlayerId);
}