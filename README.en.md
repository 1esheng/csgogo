<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/brand/cs2-dynasty-icon-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./docs/brand/cs2-dynasty-icon-light.png">
    <img src="./docs/brand/cs2-dynasty-icon-light.png" alt="CS2 Dynasty" width="130">
  </picture>
</div>
# CS2 Dynasty · CS2 Esports Manager

An **offline, frontend-only** CS2 club-manager and player-card game.
Collect player cards, build a five-man lineup, hire a head coach, call tactics round by round — and climb from the Open Qualifier all the way to the **MAJOR**.

[中文说明](README.md) · [Play online](https://1esheng.github.io/csgogo/) · [Download exe](https://github.com/1esheng/csgogo/releases/download/v1.2.1/CS2Dynasty.exe)

- Fully offline: no backend, no account, no network calls
- Saves live in IndexedDB, exportable/importable as JSON
- Round-by-round match engine (MR12 + overtime); a match is replayable from one seed
- UI language: **English** or **简体中文** (Settings → Language)


> **Image copyright**: every player photograph here belongs to **prosettings.gg / prosettings.net / profilerr.net / Wikimedia Commons / Wikipedia and their photographers**. This project claims **no copyright** and holds **no commercial licence**; photos are included for **personal study and free sharing only**. **If you are a rights holder and object to any use, please open an Issue and the image will be removed immediately after verification.** See [NOTICE.md](NOTICE.md).

> **Numbers disclaimer** — Player nicknames refer to real CS professionals, but **every attribute, rating and ability value is original in-game balance data**, not HLTV statistics and not a claim about real performance.

---

## Screenshots (English UI, captured from the live site)

| Overview | Lineup |
| --- | --- |
| ![俱乐部总览](docs/screenshots/173-en-dashboard.png) | ![阵容](docs/screenshots/174-en-lineup.png) |

| Collection | Packs |
| --- | --- |
| ![选手图鉴](docs/screenshots/175-en-collection.png) | ![卡包](docs/screenshots/176-en-packs.png) |

| Training | Coaching |
| --- | --- |
| ![训练](docs/screenshots/177-en-training.png) | ![教练组](docs/screenshots/178-en-coaching.png) |

| Match | Career |
| --- | --- |
| ![对局](docs/screenshots/179-en-match.png) | ![生涯](docs/screenshots/180-en-career.png) |

| Rankings | Achievements |
| --- | --- |
| ![排行榜](docs/screenshots/181-en-rankings.png) | ![成就](docs/screenshots/182-en-achievements.png) |

| Settings |  |
| --- | --- |
| ![设置](docs/screenshots/183-en-settings.png) |  |


---

## Features

### Cards and progression
- **305 player cards** across 5 rarities (UR 11 / SSR 17 / SR 45 / R 90 / N 142), ordered strictly by overall rating
- OVR = 62% individual + 20% role proficiency + 18% team contribution, with a full breakdown panel
- **Level cap 30**, **no star cap**: 3 duplicate cards give +1 star, each star adds +3 to all attributes
- Training, catalog and star fusion in one page (My cards / Full catalog / Star fusion)
- 212 players use real photos (each credited in src/assets/avatars/credits.json); the rest use generated silhouette avatars

### Lineup and staff
- Five roles: AWPer / Entry / Lurker / Support / Anchor, with IGL as a badge
- Auto-fill, map-fit based picking, team chemistry
- **64 real coaches** ranked by coaching ability; the head coach provides real effects:
  - Tactician: lowers the opponent in-game adaptivity
  - Disciplinarian: extra starting money for every player
  - Developer: training XP bonus
  - In-game coach: a bit of both

### Competition
- **10-tier circuit**, MAJOR at the top (64 teams, Swiss, 7 wins to take it)
- Three formats: single elimination, double elimination, Swiss with three losses
- 7 maps (Mirage / Inferno / Nuke / Ancient / Anubis / Dust2 / Train), round-by-round simulation with economy, buys, tactic counters and overtime
- Live esports world: AI results advance every 60 seconds and reshuffle the rankings

### Economy
- Player packs 500 / 4,500 / 36,000 · Coach packs 1,500 / 13,500 (two independent pools)
- Prize money rises from 2,600 to 60,000 across the ten tiers
- Cosmetic spending only: club rename 2,000, badge and colour 1,500
- **No direct card purchase** — cards come from packs or from scouting and promoting academy prospects

---

## Quick start

Requires **Node.js 18+**.

    npm install
    npm run dev        # http://127.0.0.1:5173
    npm run build      # type-check + production build into dist/
    npm run preview    # preview the production build on :4173
    npm test           # 80 automated tests

On Windows you can also double-click the batch files in the repository root:
启动游戏.bat (install + dev server + open browser), 构建并预览.bat, 运行测试.bat.

### Single-file desktop build

The release ships a 97 MB CS2Dynasty.exe produced with **Node SEA**: all 215 frontend assets are embedded into the executable and served from memory, so it needs neither Node nor a network connection.

    npm run build
    node --experimental-sea-config tools/exe/sea-config.json
    cp "$(which node)" CS2Dynasty.exe
    npx postject CS2Dynasty.exe NODE_SEA_BLOB tools/exe/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

---

## Project layout

    src/
      app/          app shell, router, navigation
      components/   shared UI, player card, avatar, radar chart
      data/         card data, AI teams, coaches, maps, config, achievements
      engine/       rating, lineup, match simulation, AI decisions, coach effects
      game/         tournament formats, schedule, packs, progression
      pages/        screens for overview, collection, lineup, packs, training,
                    coaching, scrims, career, rankings, results, achievements,
                    settings and team profile
      features/     feature modules used by the pages
      i18n/         tiny dictionary-based i18n (zh / en)
      stores/       Zustand store + IndexedDB persistence
      tests/        Vitest suites (engine, formats, migration, UI)
    tools/exe/      Node SEA packaging config and static server
    docs/screenshots/ development screenshots

Tech stack: React 18 · TypeScript 5 (strict) · Vite 5 · Tailwind 3 · Zustand 4 · Dexie 4 · Vitest 2

---

## Data and image credits

- Player nicknames, real names, countries and ages: public information only
- Avatars: **only free-licensed images are bundled (CC BY / CC BY-SA / public domain), 39 in total**, all from Wikimedia Commons and Wikipedia, credited per file in `src/assets/avatars/credits.json`; the other 266 players use **procedurally generated silhouettes** (no licensing risk)
- Ratings: attributes are calibrated locally from public player stats (Rating) by a script, but the shipped numbers are **original balance values for this game** — no site's tables are copied
- Map parameters, economy and tournament rules: original to this project
- No game assets or third-party site images are bundled


---

## Developer panel

The developer panel in Settings is **not rendered** by default. To enable it, edit and rebuild src/data/devFlags.ts:

    export const ENABLE_DEV_PANEL = false; // set to true

---

## Testing

    npm test

Covers rating and growth, the three tournament formats, overtime logic, save migration, pack pity, UI rendering and coach effects.

---

## License

[MIT](LICENSE) · For learning and entertainment; no commercial rights to any real esport event or organisation are granted.
