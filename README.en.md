<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/brand/cs2-dynasty-icon-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="./docs/brand/cs2-dynasty-icon-light.png">
  <img src="./docs/brand/cs2-dynasty-icon-light.png" alt="CS2 Dynasty logo" width="112">
</picture>

# CS2 DYNASTY

**A CS2 Esports Management Game** — build the starting five, call the tactics, and take your club to the MAJOR

**🌐 [Play in browser](https://1esheng.github.io/csgogo/)** &nbsp;·&nbsp; ⬇️ [Download for Windows](https://github.com/1esheng/csgogo/releases/download/v1.6.2/CS2Dynasty.exe) &nbsp;·&nbsp; 📖 [中文说明](README.md)

<sub>React 18 · TypeScript · Vite · fully offline · MIT</sub>

</div>

---

<div align="center">

![Club overview](docs/screenshots/173-en-dashboard.png)

<sub>Club overview: starting five, head coach, trophy cabinet and the next fixture</sub>

</div>

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
| ![Player collection](docs/screenshots/175-en-collection.png) | ![Packs](docs/screenshots/176-en-packs.png) |

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
| **Windows single file** | [CS2Dynasty.exe](https://github.com/1esheng/csgogo/releases/download/v1.6.2/CS2Dynasty.exe), 107 MB, double-click to play, no Node required |
| **Local development** | See the collapsible block below, requires Node.js 18+ |

<details>
<summary>Development and build</summary>

```bash
npm install        # install dependencies
npm run dev        # dev server → http://127.0.0.1:5173
npm run build      # type-check + production build into dist/
npm run preview    # preview the production build → :4173
npm test           # 96 automated tests
```

On Windows you can also double-click the batch files in the repository root:

| File | What it does |
| --- | --- |
| `启动游戏.bat` | install deps, start the dev server, open the browser |
| `构建并预览.bat` | production build and local preview |
| `运行测试.bat` | run the full test suite |
| `校准数值-预览.bat` | dry-run the stats calibrator from a local CSV and print the diff |
| `校准数值-写入.bat` | apply the calibration, then run tests and build |

The single-file exe is packaged with Node SEA: all frontend assets are embedded and served from memory.

```bash
npm run build
node --experimental-sea-config tools/exe/sea-config.json
cp "$(which node)" CS2Dynasty.exe
npx postject CS2Dynasty.exe NODE_SEA_BLOB tools/exe/sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
node tools/exe/set-icon.mjs src/assets/brand/icon-dark.png CS2Dynasty.exe
```

</details>

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
tools/exe/      Node SEA packaging, static server and icon injection
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
