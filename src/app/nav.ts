import {
  LayoutDashboard, Layers, Users, Package, Dumbbell, Swords, Trophy, Medal, History, Settings, Rocket, Library, GraduationCap, Award,
} from 'lucide-react';

export interface NavItem { path: string; label: string; icon: typeof LayoutDashboard; }

export const NAV_ITEMS: { path: string; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { path: '/', label: '俱乐部总览', icon: LayoutDashboard, group: '俱乐部' },
  { path: '/squad', label: '阵容', icon: Users, group: '俱乐部' },
  { path: '/gallery', label: '选手图鉴', icon: Library, group: '俱乐部' },
  { path: '/packs', label: '卡包', icon: Package, group: '俱乐部' },
  { path: '/training', label: '训练', icon: Dumbbell, group: '俱乐部' },
{ path: '/coaches', label: '教练组', icon: GraduationCap, group: '俱乐部' },
  { path: '/match', label: '训练赛', icon: Swords, group: '比赛' },
  { path: '/career', label: '生涯', icon: Rocket, group: '比赛' },
  { path: '/rankings', label: '排行榜', icon: Medal, group: '比赛' },
  { path: '/records', label: '战绩', icon: History, group: '比赛' },
  { path: '/achievements', label: '成就', icon: Award, group: '比赛' },
  { path: '/settings', label: '设置', icon: Settings, group: '系统' },
];