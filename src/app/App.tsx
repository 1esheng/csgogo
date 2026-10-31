import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Celebration } from '@/components/Celebration';
import { useLiveWorld } from '@/hooks/useLiveWorld';
import { badgeIcon } from '@/data/clubCosmetics';
import React, { useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { CheckCircle2, Coins, Menu, Shield, Trophy, Users, X, AlertTriangle, Info, Swords } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { NAV_ITEMS } from '@/app/nav';
import { Button, Input, Panel } from '@/components/ui';
import { DashboardPage } from '@/pages/DashboardPage';
import { SquadPage } from '@/pages/SquadPage';
import { PacksPage } from '@/pages/PacksPage';
import { GalleryPage } from '@/pages/GalleryPage';
import { TrainingPage } from '@/pages/TrainingPage';
import { MatchCenterPage } from '@/pages/MatchCenterPage';
import { CareerPage } from '@/pages/CareerPage';
import { RankingsPage } from '@/pages/RankingsPage';
import { TeamPage } from '@/pages/TeamPage';
import { CoachPage } from '@/pages/CoachPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { RecordsPage } from '@/pages/RecordsPage';
import { SettingsPage } from '@/pages/SettingsPage';

function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const dismiss = useGameStore((s) => s.dismissToast);
  return (
    <div className='pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2'>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'pointer-events-auto flex items-start gap-2 rounded-xl border p-3 text-sm shadow-card animate-fade-up',
            t.kind === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
            t.kind === 'error' && 'border-danger/30 bg-danger/10 text-red-100',
            t.kind === 'info' && 'border-white/10 bg-ink-700/95 text-txt',
          )}
        >
          {t.kind === 'success' ? <CheckCircle2 size={16} className='mt-0.5 shrink-0' /> : t.kind === 'error' ? <AlertTriangle size={16} className='mt-0.5 shrink-0' /> : <Info size={16} className='mt-0.5 shrink-0' />}
          <span className='flex-1 leading-snug'>{t.text}</span>
          <button onClick={() => dismiss(t.id)} className='text-current/60 hover:text-current'><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
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
          <div className='truncate font-display text-[15px] font-bold tracking-wide'>{club.name}</div>
          <div className='text-[10px] uppercase tracking-[0.16em] text-txt-muted'>齐心协力 · 第 {club.season} 赛季</div>
        </div>
      </div>

      <div className='hidden w-40 shrink-0 flex-col gap-1 sm:flex'>
        <div className='flex items-center justify-between text-[10px] text-txt-muted'>
          <span>俱乐部等级 {club.level}</span>
          <span>{club.xp} / {xpNeed} 经验</span>
        </div>
        <div className='h-1.5 overflow-hidden rounded-full bg-white/10'>
          <div className='h-full rounded-full bg-accent' style={{ width: xpPct + '%' }} />
        </div>
      </div>

      <button
        type='button'
        onClick={() => navigate('/packs')}
        className='focus-ring flex items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-1.5 text-sm font-bold text-accent'
      >
        <Coins size={14} /> {club.coins.toLocaleString()}
        <span className='ml-1 grid h-4 w-4 place-items-center rounded bg-accent/25 text-[11px] leading-none'>+</span>
      </button>

      <div className='ml-auto flex items-center gap-2 overflow-x-auto no-scrollbar lg:gap-3'>
        <div className='hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm sm:flex'>
          <Swords size={14} className='text-txt-muted' />
          <span className='text-[10px] uppercase tracking-wider text-txt-muted'>阵容战力</span>
          <span className='font-display font-bold text-accent'>{breakdown.ovr}</span>
        </div>
        <div className='hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm md:flex'>
          <Trophy size={14} className='text-txt-muted' />
          <span className='font-semibold'>{club.wins}胜 {club.losses}负</span>
          <span className='text-[11px] text-accent'>{winRate}%</span>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open ? <div className='fixed inset-0 z-40 bg-black/60 lg:hidden' onClick={onClose} /> : null}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-white/5 bg-ink-900/95 px-3.5 py-4 transition-transform duration-200 lg:static lg:translate-x-0 lg:bg-transparent',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className='mb-6 flex items-center gap-2 px-2'>
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-display text-sm font-black text-ink-900'>CS</div>
          <div>
            <div className='font-display text-[15px] font-black tracking-[0.18em] text-txt'>DYNASTY</div>
            <div className='text-[10px] uppercase tracking-[0.22em] text-txt-muted'>CS2 Manager</div>
          </div>
          <button className='ml-auto text-txt-muted lg:hidden' onClick={onClose}><X size={16} /></button>
        </div>
        <nav className='flex flex-1 flex-col gap-4 overflow-y-auto pb-2'>
          {['俱乐部', '比赛', '系统'].map((group) => (
            <div key={group}>
              <div className='mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-txt-muted/60'>{group}</div>
              <div className='flex flex-col gap-0.5'>
                {NAV_ITEMS.filter((item) => item.group === group).map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'focus-ring group relative flex items-center gap-3 rounded-lg px-3 py-3 text-base leading-none transition-all duration-150 hover:translate-x-0.5',
                        isActive
                          ? 'bg-accent/12 font-semibold text-accent'
                          : 'text-txt-muted hover:bg-white/[0.06] hover:text-txt',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? <span className='absolute left-0 h-6 w-[3px] rounded-r bg-accent' /> : null}
                        <item.icon size={21} className='shrink-0' />
                        <span className='truncate'>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className='mt-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[10px] leading-relaxed text-txt-muted/80'>
          本作所有评分均为游戏内原创平衡数值，并非真实 HLTV 统计。
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
    <div className='grid-noise flex min-h-screen items-center justify-center p-6'>
      <Panel className='w-full max-w-lg'>
        <div className='mb-1 font-display text-3xl font-black tracking-tight'>CS2 <span className='text-accent'>DYNASTY</span></div>
        <p className='mb-6 text-sm text-txt-muted'>
          一款本地的电竞经理游戏：收集选手卡、组建五人阵容、临场指挥战术，从公开预选赛一路打进 MAJOR。
        </p>
        <Input label='俱乐部名称' value={name} onChange={setName} maxLength={28} placeholder='王朝电竞' />
        <div className='mt-4 space-y-2 text-xs text-txt-muted'>
          <div>· 初始 5,000 金币与五张选手卡</div>
          <div>· 全离线存档（IndexedDB），无需账号、不联网</div>
          <div>· 真正的逐回合比赛引擎（MR12 与加时）</div>
        </div>
        <Button
          className='mt-6 w-full'
          size='lg'
          disabled={busy}
          onClick={async () => { setBusy(true); await newGame(name); setBusy(false); }}
        >
          创建俱乐部
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
        <main className='flex-1 px-4 py-5 lg:px-6'>
          <div key={location.pathname} className='animate-page-in'>
          <ErrorBoundary>
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
        <div className='animate-pulse-soft font-display text-sm uppercase tracking-[0.3em] text-txt-muted'>正在载入王朝…</div>
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