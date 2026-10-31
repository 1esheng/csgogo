# CS2 Dynasty — Implementation Plan

Local, offline browser game (React + TypeScript + Vite). No backend, no accounts, no network calls at runtime.

## Status legend
- [x] done and verified
- [~] implemented, pending verification
- [ ] not started

## Phase 0 — Toolchain
- [x] Node 24 + npm bootstrapped locally (`.tools/npm`), dependencies installed (`--ignore-scripts`, esbuild binary from `@esbuild/win32-x64`)
- [x] Vite 5 / React 18 / TS 5 (strict) / Tailwind 3 / zustand / Dexie / lucide-react / recharts / vitest

## Phase 1 — Contract layer (`src/types`, `src/data`)
- [x] Domain model split into identity / card template / owned card instance
- [x] 46 season templates across 36 player identities (N/R/SR/SSR/UR)
- [x] Role-weighted OVR model (`ROLE_WEIGHTS`, 0.75 attributes + 0.25 proficiency)
- [x] 3 maps with independent T/CT bias, mid value, tempo, AWP factor, per-site difficulty
- [x] 6 T tactics + 5 CT tactics, all with mechanical effects (contact timing, split, utility, trade, plant speed, spread/stack counters)
- [x] Weapon table (pistol / strong pistol / SMG / rifle / AWP) with cost, power, precision, kill reward
- [x] 16 AI teams across 5 tiers with rosters, tactic preferences, map pools, economy style, adaptivity

## Phase 2 — Ratings, squad, persistence
- [x] Role OVR, level growth (bounded, role ordered), card XP curve Lv.1-5
- [x] Squad breakdown: role fit, out-of-position penalty, IGL influence, pair chemistry, synergy cap
- [x] Dexie schema (`saves`, `replays`) + snapshot validation for import
- [x] zustand store as the single data source; every mutation persists

## Phase 3 — Match engine (`src/engine`)
- [x] Seeded mulberry32 RNG, engine replayable from `match.seed`
- [x] Round state machine: buy -> tactic -> map control -> opening duel -> engagements -> plant -> retake/defuse -> explosion, with all end conditions
- [x] Bomb rules: plant survives T extinction; defuse vs explosion窗口 checked explicitly
- [x] MR12, halftime swap, overtime blocks with correct targets (16 / 19 / 22), OT side swaps every 3 rounds
- [x] Economy: loss ladder, win reward, plant bonus, kill rewards, per-player wallets, no overspend
- [x] Full statistics from events: K/D/A, ADR, KAST, opening duels, multi-kills, clutches, rating, MVP
- [x] AI orders: buy style, tactic preference, adaptation to past rounds, counters to observed tactics (no future knowledge)
- [x] Automated validation: 1000 even matches, 1000 mismatched matches, illegal-state checks

## Phase 4 — UI
- [x] 全站简体中文本地化（术语表集中在 types/data，引擎战报与存档报错同样中文）
- [x] App shell: sidebar navigation (11 destinations), top status bar, toasts, onboarding
- [x] UI kit + player card visuals + card detail with SVG attribute radar
- [x] Dashboard, Collection, Packs, Squad, Training, Match Center, Career, Tournament, Rankings, Records, Settings

## Phase 5 — Integration
- [x] Full `tsc --noEmit` clean
- [x] Dev server boot + browser verification via Chrome DevTools protocol (11 screenshots)
- [x] Cross-page reward/state consistency review (found and fixed: leaderboard tier sync, auto-fill IGL, order re-seat after side swap, event victim semantics)

## Phase 6 — Acceptance
- [x] Persistence tests (reload / dev-server restart / export / import)
- [x] `npm run build` production build
- [x] README with Windows instructions

## Key conventions
- All balance numbers live in `src/data/config.ts`; nothing balance-related is in components.
- The engine never imports React. It can run headless (see `src/tests/simulation.test.ts`).
- Rewards are idempotent: a match id already present in history can never pay out twice.
- Save version is checked on import; unknown/malformed data is rejected with a reason.