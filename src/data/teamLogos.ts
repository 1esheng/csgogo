/**
 * 战队 LOGO：把图片放进 src/assets/team-logos/，文件名用 teamId（见 data/aiTeams.ts）。
 * 各战队名称与 LOGO 的版权归各自所有者；本项目仅用于非商业的识别性展示，权利人可要求立即删除（见 NOTICE.md）。
 * 构建时由 Vite 打包成本地资源，断网也能显示；没有对应文件时回退到首字母方标。
 */
const modules = import.meta.glob('../assets/team-logos/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const byTeamId: Record<string, string> = {};
Object.entries(modules).forEach(([path, url]) => {
  const file = path.split('/').pop() ?? '';
  const id = file.replace(/\.[^.]+$/, '').toLowerCase();
  if (id) byTeamId[id] = url;
});

/** teamId → 本地 LOGO 资源 URL；没有收录的队伍不在表里，由 TeamLogo 回退到默认方标。 */
export const TEAM_LOGOS: Partial<Record<string, string>> = byTeamId;

export function logoFor(teamId?: string | null): string | null {
  if (!teamId) return null;
  return byTeamId[teamId.toLowerCase()] ?? null;
}

export function logoCount(): number {
  return Object.keys(byTeamId).length;
}
