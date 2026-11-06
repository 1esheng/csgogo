<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/brand/cs2-dynasty-icon-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./docs/brand/cs2-dynasty-icon-light.png">
    <img src="./docs/brand/cs2-dynasty-icon-light.png" alt="CS2 Dynasty" width="130">
  </picture>

# CS2 Dynasty · CS2 Esports Manager

**An offline CS2 club manager and player-card game**

Collect cards, build a five-man lineup, hire a head coach, call tactics round by round — climb from the Open Qualifier to the MAJOR

[![Tests](https://img.shields.io/badge/tests-82%20passed-2ea44f?style=flat-square)](#-testing)
[![CI](https://github.com/1esheng/csgogo/actions/workflows/ci.yml/badge.svg)](https://github.com/1esheng/csgogo/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-v1.3.8-f5a623?style=flat-square)](https://github.com/1esheng/csgogo/releases)
[![Node](https://img.shields.io/badge/node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-18-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/vite-5-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

🌐 **[Play online](https://1esheng.github.io/csgogo/)** · ⬇️ **[Download exe](https://github.com/1esheng/csgogo/releases/download/v1.3.8/CS2Dynasty.exe)** · 📖 **[中文说明](README.md)** · 🗂 **[Project layout](#-project-layout)** · 🐛 **[Report an issue](https://github.com/1esheng/csgogo/issues)**

</div>

---

## ✨ Features

- ⌨️ **Match hotkeys** — Space advances the round, 1–4 focus tactic selects, Esc closes dialogs
- ⌨️ **Ctrl/Cmd+K command palette** — jump to any of the 12 pages from the keyboard
- 📲 **Installable PWA** — add the web build to your desktop and it runs in its own window
- ✅ **CI pipeline** — every push runs type check, 80 tests and a production build (badge above)
- 🃏 **305 player cards** — five rarities (UR 11 / SSR 17 / SR 45 / R 90 / N 142), ordered strictly by overall rating
- 🎯 **Explainable ratings** — OVR = 62% individual + 20% role proficiency + 18% team, with a full breakdown panel
- ⭐ **Level cap 30, no star cap** — three duplicates give one star; each star adds +3 to every attribute and +10 mastery
- 🧑‍🏫 **64 real coaches** — a separate pool with four coaching styles (attributes / training / economy / lowering opponent adaptivity)
- 🏆 **Ten-tier circuit** — Open Qualifier up to the MAJOR (64 teams, Swiss, seven wins to take it); single elim, double elim and Swiss formats
- 🎮 **Round-by-round engine** — 7 maps, economy and buys, tactic counters, MR12 with overtime, fully replayable from one seed
- 🌍 **Live esports world** — AI fixtures advance every 60 seconds and reshuffle the world rankings
- 💾 **Fully offline** — no backend, no account, no network calls; saves live in IndexedDB and export as JSON
- 🌏 **Bilingual UI** — switch between English and Simplified Chinese in Settings

## 📸 Screenshots

> Captured from the live site with the English UI

| Overview | Lineup |
| --- | --- |
| ![Overview](docs/screenshots/173-en-dashboard.png) | ![Lineup](docs/screenshots/174-en-lineup.png) |

| Collection | Packs |
| --- | --- |
| ![Collection](docs/screenshots/175-en-collection.png) | ![Packs](docs/screenshots/176-en-packs.png) |

| Training | Coaching |
| --- | --- |
| ![Training](docs/screenshots/177-en-training.png) | ![Coaching](docs/screenshots/178-en-coaching.png) |

| Match | Career |
| --- | --- |
| ![Match](docs/screenshots/179-en-match.png) | ![Career](docs/screenshots/180-en-career.png) |

| Rankings | Achievements |
| --- | --- |
| ![Rankings](docs/screenshots/181-en-rankings.png) | ![Achievements](docs/screenshots/182-en-achievements.png) |

| Settings |
| --- |
| ![Settings](docs/screenshots/183-en-settings.png) |

## 🚀 Quick start

Requires **Node.js 18+**

```bash
npm install        # install dependencies
npm run dev        # dev server → http://127.0.0.1:5173
npm run build      # type-check + production build into dist/
npm run preview    # preview the production build → :4173
npm test           # 82 automated tests
```

On Windows you can also double-click the batch files in the repository root:

| File | What it does |
| --- | --- |
| `启动游戏.bat` | install deps, start the dev server, open the browser |
| `构建并预览.bat` | production build and local preview |
| `运行测试.bat` | run the full test suite |
| `校准数值-预览.bat` | dry-run the stats calibrator from a local CSV and print the diff |
| `校准数值-写入.bat` | apply the calibration, then run tests and build |

## 📦 Single-file exe and deployment

The release ships a **97 MB `CS2Dynasty.exe`** built with **Node SEA**: all 221 frontend assets are embedded and served from memory, so it needs neither Node nor a network connection.

```bash
npm run build
node --experimental-sea-config tools/exe/sea-config.json
cp "$(which node)" CS2Dynasty.exe
npx postject CS2Dynasty.exe NODE_SEA_BLOB tools/exe/sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
```

The live site is served by GitHub Pages from the `gh-pages` branch: <https://1esheng.github.io/csgogo/>

## 🗂 Project layout

```
src/
  app/          app shell, router, sidebar and top bar
  components/   shared UI, player card, avatar, radar chart
  data/         cards, AI teams, coaches, maps, config, achievements
  engine/       rating, lineup, match simulation, AI decisions, coach effects
  game/         formats, calendar, packs, progression, academy
  pages/        12 screens (overview / lineup / collection / packs / training /
                coaching / match / career / rankings / results / achievements / settings)
  features/     page-level feature modules
  i18n/         tiny dictionary-based i18n (zh / en)
  stores/       Zustand state with IndexedDB persistence
  tests/        Vitest suites (engine / formats / migration / UI)
tools/exe/      Node SEA packaging config and static server
docs/brand/     logo assets for light and dark themes
docs/screenshots/ UI screenshots
scripts/        local numeric calibration (HLTV ratings / Valve ranking)
```

Tech stack: React 18 · TypeScript 5 (strict) · Vite 5 · Tailwind 3 · Zustand 4 · Dexie 4 · Vitest 2

## 🧪 Testing

```bash
npm test
```

Covers rating and growth, the three tournament formats, overtime logic, save migration, pack pity, coach effects and UI rendering.

## 🛠 Developer panel

The developer panel in Settings is **not rendered** by default. To enable it, edit and rebuild:

```ts
// src/data/devFlags.ts
export const ENABLE_DEV_PANEL = false; // set to true
```

## 📜 Data and image credits

- Player nicknames, real names, countries and ages: public information
- Avatars: **212 real photos** from prosettings.gg, prosettings.net, profilerr.net, Wikimedia Commons and Wikipedia, credited per file in `src/assets/avatars/credits.json`; the rest use generated silhouettes
- Ratings: attributes are calibrated locally from public player stats, but the shipped numbers are **original balance values for this game** — no site's tables are copied
- Map parameters, economy and tournament rules: original to this project
- No game assets or third-party textures are bundled

## ⚖️ License and copyright

Code is released under [MIT](LICENSE). **Every player photograph belongs to its original site and photographer**; this project is for personal study and free sharing only and claims no copyright or commercial licence.

**If you are a rights holder and object to any use, please open an [issue](https://github.com/1esheng/csgogo/issues) and the image will be removed immediately after verification.** See [NOTICE.md](NOTICE.md).
