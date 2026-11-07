# Contributing

Thanks for taking a look. This is a solo hobby project, so the fastest way to get a change in is a small, focused pull request.

## Getting set up

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm test         # 82 tests
npm run build    # type-check + production build
```

Node.js 18 or newer. Windows users can double-click `启动游戏.bat` instead.

## Before you open a PR

1. `npx tsc --noEmit` passes — the project is strict TypeScript.
2. `npm test` is green; if you change the engine, add a case to the matching suite.
3. UI text goes through `tr()` / `pick()` from `src/i18n` — no bare Chinese literals in components, and English stays sentence case.
4. No new runtime dependency unless the PR explains why the existing stack cannot do it.

## Where things live

| Path | What |
| --- | --- |
| `src/engine` | rating, lineup, match simulation, AI decisions |
| `src/data` | cards, AI teams, coaches, maps, config |
| `src/stores` | Zustand store and IndexedDB persistence |
| `src/i18n` | phrase table and per-area dictionaries |
| `src/pages`, `src/features` | screens and their feature modules |
| `tools/exe` | Node SEA packaging and icon injection |

## Content rules

- Player photos are third-party; do not add new ones without a licence that allows redistribution. See [NOTICE.md](NOTICE.md).
- Map thumbnails are original abstract drawings — do not replace them with real map layouts or vendor assets.
- Ratings are original balance values; do not paste tables from HLTV or similar sites.

## Reporting a bug

Use the issue template and include the surface (web / exe / dev), the version, and the steps. A screenshot or a console excerpt saves a round trip.
