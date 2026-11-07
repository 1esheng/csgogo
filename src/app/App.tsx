import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Celebration } from '@/components/Celebration';
import { useLiveWorld } from '@/hooks/useLiveWorld';
import { useT } from '@/hooks/useLang';
import brandMark from '@/assets/brand/icon-dark.png';
import heroImage from '@/assets/brand/onboarding-hero.png';
import { tr } from '@/i18n';
import { badgeIcon } from '@/data/clubCosmetics';
import React, { useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { CheckCircle2, Coins, Menu, Shield, Trophy, Users, X, AlertTriangle, Info, Swords } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { NAV_ITEMS } from '@/app/nav';

const DashboardPage = React.lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SquadPage = React.lazy(() => import('@/pages/SquadPage').then((m) => ({ default: m.SquadPage })));
const PacksPage = React.lazy(() => import('@/pages/PacksPage').then((m) => ({ default: m.PacksPage })));
const GalleryPage = React.lazy(() => import('@/pages/GalleryPage').then((m) => ({ default: m.GalleryPage })));
const TrainingPage = React.lazy(() => import('@/pages/TrainingPage').then((m) => ({ default: m.TrainingPage })));
const MatchCenterPage = React.lazy(() => import('@/pages/MatchCenterPage').then((m) => ({ default: m.MatchCenterPage })));
const CareerPage = React.lazy(() => import('@/pages/CareerPage').then((m) => ({ default: m.CareerPage })));
const RankingsPage = React.lazy(() => import('@/pages/RankingsPage').then((m) => ({ default: m.RankingsPage })));
const TeamPage = React.lazy(() => import('@/pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const CoachPage = React.lazy(() => import('@/pages/CoachPage').then((m) => ({ default: m.CoachPage })));
const AchievementsPage = React.lazy(() => import('@/pages/AchievementsPage').then((m) => ({ default: m.AchievementsPage })));
const RecordsPage = React.lazy(() => import('@/pages/RecordsPage').then((m) => ({ default: m.RecordsPage })));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
import { Button, Input, Panel } from '@/components/ui';
import { CommandPalette } from '@/components/CommandPalette';

function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const dismiss = useGameStore((s) => s.dismissToast);
  return (
    <div className='pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2'>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'motion-rise pointer-events-auto flex items-start gap-2 rounded-xl border p-3 text-[15px] shadow-card',
            t.kind === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
            t.kind === 'error' && 'border-danger/30 bg-danger/10 text-red-100',
            t.kind === 'info' && 'border-white/10 bg-ink-700/95 text-txt',
          )}
        >
          {t.kind === 'success' ? <CheckCircle2 size={16} className='mt-0.5 shrink-0' /> : t.kind === 'error' ? <AlertTriangle size={16} className='mt-0.5 shrink-0' /> : <Info size={16} className='mt-0.5 shrink-0' />}
          <span className='flex-1 leading-snug'>{t.text}</span>
          <button onClick={() => dismiss(t.id)} className='focus-ring t-colors rounded text-current/60 hover:text-current'><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { t, tr } = useT();
  const club = useGameStore((s) => s.club);
  const squad = useGameStore((s) => s.squad);
  const squadRating = useGameStore((s) => s.squadRating);
  const breakdown = useMemo(() => squadRating(), [squadRating, squad]);
  const navigate = useNavigate();
  const total = club.wins + club.losses;
  const winRate = total > 0 ? Math.round((club.wins / total) * 100) : 0;
  const xpNeed = Math.max(1, club.level * 120);
  const xpPct = Math.min(100, Math.round((club.xp / xpNeed) * 100));
  return (
    <header className='sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-white/5 bg-ink-900/90 px-4 py-2.5 backdrop-blur-md lg:px-6'>
      <button className='focus-ring rounded-lg p-2 text-txt-muted lg:hidden' onClick={onMenu} aria-label='菜单'><Menu size={18} /></button>
      <div className='flex min-w-0 items-center gap-2.5'>
        <div className='flex h-10 w-10 items-center justify-center rounded-xl' style={{ background: (club.color ?? '#F5A623') + '22', border: '1px solid ' + (club.color ?? '#F5A623') + '55' }}>{React.createElement(badgeIcon(club.badge).icon, { size: 20, style: { color: club.color ?? '#F5A623' } })}</div>
        <div className='min-w-0'>
          <div className='truncate font-display text-[15px] font-semibold tracking-wide'>{club.name}</div>
          <div className='text-[12px] text-txt-muted'>{tr('齐心协力')} · {tr('第')} {club.season} {tr('赛季')}</div>
        </div>
      </div>

      <div className='hidden w-40 shrink-0 flex-col gap-1 sm:flex'>
        <div className='flex items-center justify-between text-[12px] text-txt-muted'>
          <span>{tr('俱乐部等级')} {club.level}</span>
          <span>{club.xp} / {xpNeed} {tr('经验')}</span>
        </div>
        <div className='h-1.5 overflow-hidden rounded-full bg-white/10'>
          <div className='h-full rounded-full bg-accent' style={{ width: xpPct + '%' }} />
        </div>
      </div>

      <button
        type='button'
        onClick={() => navigate('/packs')}
        className='focus-ring t-press flex items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-1.5 text-[15px] font-semibold text-accent active:scale-[0.985]'
      >
        <Coins size={14} /> {club.coins.toLocaleString()}
        <span className='ml-1 grid h-4 w-4 place-items-center rounded bg-accent/25 text-[12px] leading-none'>+</span>
      </button>

      <div className='ml-auto flex items-center gap-2 overflow-x-auto no-scrollbar lg:gap-3'>
        <div className='hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[15px] sm:flex'>
          <Swords size={14} className='text-txt-muted' />
          <span className='text-[12px] text-txt-muted'>{t('common.lineupPower')}</span>
          <span className='font-display font-semibold text-accent'>{breakdown.ovr}</span>
        </div>
        <div className='hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[15px] md:flex'>
          <Trophy size={14} className='text-txt-muted' />
          <span className='font-semibold'>{club.wins}W {club.losses}L</span>
          <span className='text-[12px] text-accent'>{winRate}%</span>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  return (
    <>
      {open ? <div className='motion-fade fixed inset-0 z-40 bg-black/60 lg:hidden' onClick={onClose} /> : null}
      <aside
        className={clsx(
          't-transform fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-white/5 bg-ink-900/95 px-3.5 py-4 lg:static lg:translate-x-0 lg:bg-transparent',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className='mb-6 flex items-center gap-2 px-2'>
          <img src={brandMark} alt='CS2 Dynasty' width={36} height={36} className='h-9 w-9 shrink-0 select-none' draggable={false} />
          <div>
            <div className='font-display text-[15px] font-semibold tracking-[0.12em] text-txt'>DYNASTY</div>
            <div className='text-[12px] tracking-[0.14em] text-txt-muted'>CS2 Manager</div>
          </div>
          <button className='focus-ring t-colors ml-auto rounded text-txt-muted lg:hidden' onClick={onClose}><X size={16} /></button>
        </div>
        <nav className='flex flex-1 flex-col gap-4 overflow-y-auto pb-2'>
          {['nav.group.club', 'nav.group.match', 'nav.group.system'].map((group) => (
            <div key={group}>
              <div className='mb-1 mt-6 px-2.5 text-[12px] font-medium text-txt-muted first:mt-0'>{t(group)}</div>
              <div className='flex flex-col gap-0.5'>
                {NAV_ITEMS.filter((item) => item.group === group).map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'focus-ring t-colors group relative flex h-[36px] items-center gap-2.5 rounded-lg px-2.5 text-[14px] leading-none',
                        isActive
                          ? 'bg-white/[0.06] font-medium text-txt'
                          : 'text-txt-muted hover:bg-white/[0.06] hover:text-txt',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? <span className='absolute left-0 h-4 w-[2px] rounded-r bg-accent' /> : null}
                        <item.icon size={16} className='shrink-0 opacity-80' />
                        <span className='truncate'>{t(item.labelKey)}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className='mt-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[12px] leading-relaxed text-txt-muted'>
          All ratings in this game are original balance values, not real HLTV statistics.
        </div>
      </aside>
    </>
  );
}

function Onboarding() {
  const [name, setName] = useState('王朝电竞');
  const newGame = useGameStore((s) => s.newGame);
  const [busy, setBusy] = useState(false);
  return (
    <div className='relative flex min-h-screen items-center justify-start overflow-hidden p-6 lg:p-12'>
      <img
        src={heroImage}
        alt=''
        aria-hidden
        className='pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[68%] object-cover lg:block'
      />
      <Panel className='motion-rise relative w-full max-w-lg bg-ink-900/95'>
        <div className='mb-1 font-display text-3xl font-semibold tracking-tight'>CS2 <span className='text-accent'>DYNASTY</span></div>
        <p className='mb-6 text-[15px] text-txt-muted'>
          {tr('一款本地的电竞经理游戏：收集选手卡、组建五人阵容、临场指挥战术，从公开预选赛一路打进 MAJOR。')}
        </p>
        <Input label='俱乐部名称' value={name} onChange={setName} maxLength={28} placeholder='王朝电竞' />
        <div className='mt-4 space-y-2 text-[13px] text-txt-muted'>
          <div>{tr('· 初始 5,000 金币与五张选手卡')}</div>
          <div>{tr('· 全离线存档（IndexedDB），无需账号、不联网')}</div>
          <div>{tr('· 真正的逐回合比赛引擎（MR12 与加时）')}</div>
        </div>
        <Button
          className='mt-6 w-full'
          size='lg'
          disabled={busy}
          onClick={async () => { setBusy(true); await newGame(name); setBusy(false); }}
        >
          {tr('创建俱乐部')}
        </Button>
      </Panel>
    </div>
  );
}

function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); window.scrollTo({ top: 0 }); }, [location.pathname]);
  return (
    <div className='flex min-h-screen bg-ink-900'>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className='flex min-w-0 flex-1 flex-col'>
        <TopBar onMenu={() => setMenuOpen(true)} />
        <CommandPalette />
        <main className='flex-1 px-4 py-5 lg:px-6'>
          <div key={location.pathname} className='motion-page'>
          <ErrorBoundary>
        <React.Suspense fallback={<div className="flex h-64 items-center justify-center text-[13px] text-txt-muted">{tr('正在载入…')}</div>}>
        <Routes>
            <Route path='/' element={<DashboardPage />} />
            <Route path='/collection' element={<GalleryPage />} />
            <Route path='/squad' element={<SquadPage />} />
            <Route path='/gallery' element={<GalleryPage />} />
            <Route path='/packs' element={<PacksPage />} />
            <Route path='/training' element={<TrainingPage />} />
            <Route path='/match' element={<MatchCenterPage />} />
            <Route path='/career' element={<CareerPage />} />
            <Route path='/tournament' element={<Navigate to='/career' replace />} />
            <Route path='/rankings' element={<RankingsPage />} />
            <Route path='/team/:teamId' element={<TeamPage />} />
<Route path='/coaches' element={<CoachPage />} />
            <Route path='/achievements' element={<AchievementsPage />} />
            <Route path='/records' element={<RecordsPage />} />
            <Route path='/settings' element={<SettingsPage />} />
            <Route path='*' element={<DashboardPage />} />
          </Routes>
        </React.Suspense>
      </ErrorBoundary>
          </div>
        </main>
      </div>
      <Toasts />
      <Celebration />
    </div>
  );
}

export function App() {
  useLiveWorld();
  const ready = useGameStore((s) => s.ready);
  const hasGame = useGameStore((s) => s.hasGame);
  const init = useGameStore((s) => s.init);
  useEffect(() => { void init(); }, [init]);

  if (!ready) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-ink-900'>
        <div className='animate-pulse-soft font-display text-[15px] tracking-[0.14em] text-txt-muted'>{tr('正在载入王朝…')}</div>
      </div>
    );
  }
  if (!hasGame) return <Onboarding />;
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}