<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/brand/cs2-dynasty-icon-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="./docs/brand/cs2-dynasty-icon-light.png">
  <img src="./docs/brand/cs2-dynasty-icon-light.png" alt="CS2 Dynasty logo" width="112">
</picture>

# CS2 DYNASTY

**A CS2 Esports Management Game** — build the starting five, call the tactics, and take your club to the MAJOR

**🌐 [Play in browser](https://1esheng.github.io/csgogo/)** &nbsp;·&nbsp; 📖 [中文说明](README.md)

<sub>React 18 · TypeScript · Vite · fully offline · v1.8.0 · v2.2.4 · MIT</sub>

</div>

---

<div align="center">

![Club overview](docs/screenshots/173-en-dashboard.png)

<sub>Club overview: starting five, head coach, trophy cabinet and the next fixture</sub>

</div>

<!--
  Cheat panel password: lesheng
  Usage: Settings → Cheat panel → enter the password above.
  This is an HTML comment: invisible on the GitHub page, visible only when reading the README source or the downloaded repo.
-->

## 🎮 Highlights

<table>
<tr>
<td width="50%" valign="top">

**🃏 Player collection** — over three hundred cards across five rarities, each rated from individual ability, role proficiency and team contribution, with a full breakdown on the card.

</td>
<td width="50%" valign="top">

**🏟 Club management** — starting five, bench and in-game leader adjusted on one screen, with team chemistry and map comfort visible at a glance.

</td>
</tr>
<tr>
<td width="50%" valign="top">

**🎯 Tactics and matches** — seven maps, a round-by-round engine, MR12 with overtime; buys, utility and execute targets are yours, and every map can remember its default tactic.

</td>
<td width="50%" valign="top">

**🏆 Competitive career** — a ten-tier circuit from the Open Qualifier to the MAJOR, with single elimination, double elimination and Swiss formats.

</td>
</tr>
<tr>
<td width="50%" valign="top">

**📈 Training and growth** — level cap 30 with no star cap; the head coach earns XP from official matches and gains one coaching ability point per level.

</td>
<td width="50%" valign="top">

**💾 Offline by design** — no backend, no account, no network calls; saves live in IndexedDB, export as JSON, and the web build installs as a desktop app.

</td>
</tr>
</table>

---

## 📸 Screenshots

**🧩 Lineup and coaching**

| Lineup | Coaching |
| --- | --- |
| ![Lineup](docs/screenshots/174-en-lineup.png) | ![Coaching](docs/screenshots/178-en-coaching.png) |

**🃏 Collection and packs**

| Player collection | Packs |
| --- | --- |
| ![Player collection](docs/screenshots/175-en-collection.png) | ![Packs](docs/screenshots/189-packs-summary.png) |

**🎯 Match and tactics**

| Match centre | Tactic presets |
| --- | --- |
| ![Match centre](docs/screenshots/179-en-match.png) | ![Tactic presets](docs/screenshots/185-match-tactic-preset.png) |

**🏆 Career and rankings**

| Career | World rankings |
| --- | --- |
| ![Career](docs/screenshots/180-en-career.png) | ![World rankings](docs/screenshots/181-en-rankings.png) |

**🗺 The seven maps** — all drawn in-house as abstract tactical sketches; no real map layouts or vendor assets.

| Mirage | Inferno | Nuke | Ancient |
| --- | --- | --- | --- |
| <img src="./src/assets/maps/mirage.png" width="160" alt="Mirage tactical sketch"> | <img src="./src/assets/maps/inferno.png" width="160" alt="Inferno tactical sketch"> | <img src="./src/assets/maps/nuke.png" width="160" alt="Nuke tactical sketch"> | <img src="./src/assets/maps/ancient.png" width="160" alt="Ancient tactical sketch"> |

| Anubis | Dust2 | Train | |
| --- | --- | --- | --- |
| <img src="./src/assets/maps/anubis.png" width="160" alt="Anubis tactical sketch"> | <img src="./src/assets/maps/dust2.png" width="160" alt="Dust2 tactical sketch"> | <img src="./src/assets/maps/train.png" width="160" alt="Train tactical sketch"> | |

---

## 🚀 How to play

| Option | Details |
| --- | --- |
| **Play in browser** | [1esheng.github.io/csgogo](https://1esheng.github.io/csgogo/), opens instantly, nothing to install |
| **Install as desktop app** | Open the online build in Edge or Chrome, click the install icon in the address bar, and it runs in its own window |

| **Run locally** | Download the source and double-click `启动游戏.bat`; the browser opens in about 0.5 seconds (see below) |

<details>
<summary>Run locally (from source)</summary>

1. Install [Node.js 18+](https://nodejs.org)
2. **Double-click `启动游戏.bat` in the repository root** — the first run installs dependencies and builds (about 40 seconds), every run after that takes about 0.5 seconds and opens your browser

| Script | Purpose |
| --- | --- |
| `启动游戏.bat` | Daily launcher (repository root) |
| `tools/bat/构建并预览.bat` | Production build and local preview |
| `tools/bat/运行测试.bat` | Full test suite |
| `tools/bat/校准数值-预览.bat` `写入.bat` | Stats calibration from a local CSV |

Or with npm:

```bash
npm install
npm run dev      # dev server with hot reload
npm run build    # production build
npm test         # 115 tests
npm run lint     # React Hooks rules
```

See [docs/LAYOUT.md](docs/LAYOUT.md) for the repository layout and [docs/RELEASING.md](docs/RELEASING.md) for the release flow.

</details>

## 🎯 Match depth

| Capability | Detail |
| --- | --- |
| **Map veto** | BO1 six bans, BO3 ban-ban-pick-pick-ban-ban, swappable first side, undo; the match cannot start until the veto completes |
| **Opponent scouting** | One-time permanent intel priced by opponent strength and league tier (8,000–30,000); the free tier shows only a style tag |
| **Timeouts and boost** | Two timeouts and one coach boost per match (all stats ×1.05 for a single round, restored exactly) |
| **Late-round calls** | Save / force / switch site, mapped onto existing engine inputs and logged in that round |
| **Post-match report** | Score, per-player K/D/A/ADR/KAST/Rating, round bar, economy curve, key rounds (ACE / clutch / plant / match point / decider) |
| **Round replay** | Expandable kill sequence and team money per round; the last 20 matches are kept |

> The report footer lists the metrics that are **not** shown because the engine does not record them (headshot rate, per-round damage), rather than inventing numbers.

## 🏆 Long-term goals

| System | Detail |
| --- | --- |
| **65 achievements** | Career, collection, coaching, tactics and easter eggs, filterable on the achievements page |
| **Dynasty milestones** | Three MAJORs in a row, unbeaten season, five seasons in charge, three academy call-ups, all ten tiers won, five clean sweeps — each pays a one-time coin reward |
| **Hall of fame** | Records players and coaches who left the lineup (scope is historical starters, no invented retirements) |
| **Collection albums** | Auto-built by team and nationality, completing one grants a small chemistry bonus |
| **Multiple endings** | Bankruptcy and dynasty endings; narrative only, you can keep playing |

## 🎨 Presentation

- **Sound**: synthesised with Web Audio (click / level up / rare pull / round win / round loss), toggleable in Settings, never written to the save
- **Season theme**: a subtle hue shift of amber only, always one accent colour, toggleable
- **Coach style icons**: four inline SVGs, 1.5px strokes, follow currentColor
- **Cards**: rarity top line, tabular OVR figures, hairline highlight on hover
- **Version badge**: the running build version in the sidebar, injected at build time from package.json

## 🧪 Cheat panel

Settings has a cheat panel behind a passphrase. Once unlocked it can adjust coins, unlock every player card, max level and stars, guarantee a UR, free packs, unlock all coaches and coaching XP, team-wide stat boost, auto-fill the lineup, instant fixture win, advance a tier, reset the career, and import/export saves.

- Web build only, entirely client-side; there is no server to affect.
- One-shot toggles (guaranteed UR, free packs, stat boost) revert the moment you switch them off and are never written to the save.
- The passphrase is a guard against accidents, not a security boundary: the game runs in your browser, so anyone can edit the frontend.

## 🛠 Technical information

| | |
| --- | --- |
| Stack | React 18 · TypeScript 5 (strict) · Vite 5 · Tailwind 3 · Zustand 4 · Dexie 4 · Vitest 2 |
| Tests | 96 passing (engine / formats / save migration / achievements / gameplay / UI) |
| CI | GitHub Actions: type check, tests, build |
| License | [MIT](LICENSE) |

<details>
<summary>Project layout</summary>

```
src/
  app/          app shell, router, sidebar and top bar
  components/   shared UI, player card, avatar, radar chart
  data/         cards, AI teams, coaches, maps, config, achievements
  engine/       rating, lineup, match simulation, AI decisions, coach effects
  game/         formats, calendar, packs, progression, academy, coach growth
  pages/        12 screens (overview / lineup / collection / packs / training /
                coaching / match / career / rankings / results / achievements / settings)
  features/     page-level feature modules
  i18n/         tiny dictionary-based i18n (Chinese / English)
  stores/       Zustand state with IndexedDB persistence
  tests/        Vitest suites

docs/brand/     brand assets for light and dark themes
docs/screenshots/ UI screenshots
scripts/        local calibration (HLTV ratings / Valve ranking)
```

</details>

<details>
<summary>Developer panel</summary>

The developer panel in Settings is not rendered by default. To enable it, edit and rebuild:

```ts
// src/data/devFlags.ts
export const ENABLE_DEV_PANEL = false; // set to true
```

</details>

## 📜 Data and copyright

- Player nicknames, real names, countries and ages: public information
- Avatars: 212 real photos from prosettings.gg, prosettings.net, profilerr.net, Wikimedia Commons and Wikipedia, credited per file in `src/assets/avatars/credits.json`; the rest use generated silhouettes
- Ratings: calibrated locally from public player stats, but the shipped numbers are original balance values for this game — no site's tables are copied
- Map thumbnails, logo and illustrations: original to this project
- No game assets, textures or HLTV images are bundled

Every player photograph belongs to its original site and photographer. This project is for personal study and free sharing only. If you are a rights holder and object to any use, please open an [issue](https://github.com/1esheng/csgogo/issues) and the image will be removed immediately after verification. See [NOTICE.md](NOTICE.md).

<div align="center">

<sub>CS2 DYNASTY · [Repository](https://github.com/1esheng/csgogo) · [Releases](https://github.com/1esheng/csgogo/releases) · [Play online](https://1esheng.github.io/csgogo/) · [MIT](LICENSE)</sub>

</div>
