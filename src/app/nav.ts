import {
  LayoutDashboard, Layers, Users, Package, Dumbbell, Swords, Trophy, Medal, History, Settings, Rocket, Library, GraduationCap, Award,
} from 'lucide-react';

export interface NavItem { path: string; labelKey: string; icon: typeof LayoutDashboard; }

export const NAV_ITEMS: { path: string; labelKey: string; icon: typeof LayoutDashboard; group: string }[] = [
  { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, group: 'nav.group.club' },
  { path: '/squad', labelKey: 'nav.squad', icon: Users, group: 'nav.group.club' },
  { path: '/gallery', labelKey: 'nav.gallery', icon: Library, group: 'nav.group.club' },
  { path: '/packs', labelKey: 'nav.packs', icon: Package, group: 'nav.group.club' },
  { path: '/training', labelKey: 'nav.training', icon: Dumbbell, group: 'nav.group.club' },
{ path: '/coaches', labelKey: 'nav.coaches', icon: GraduationCap, group: 'nav.group.club' },
  { path: '/match', labelKey: 'nav.match', icon: Swords, group: 'nav.group.match' },
  { path: '/career', labelKey: 'nav.career', icon: Rocket, group: 'nav.group.match' },
  { path: '/rankings', labelKey: 'nav.rankings', icon: Medal, group: 'nav.group.match' },
  { path: '/records', labelKey: 'nav.records', icon: History, group: 'nav.group.match' },
  { path: '/achievements', labelKey: 'nav.achievements', icon: Award, group: 'nav.group.match' },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings, group: 'nav.group.system' },
];