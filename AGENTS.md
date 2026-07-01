# MTG Arena Coach

An MTG Arena overlay + companion (desktop + Android) that coaches drafting and
best plays, inspired by [untapped.gg](https://untapped.gg). It works the way
community trackers do: by tailing MTG Arena's `Player.log` (which requires
enabling **Detailed Logs (Plugin Support)** in the game's settings) and turning
those events into pick recommendations and an in-game tracker.

## Layout (pnpm workspace)

- `packages/core` (`@mtg-coach/core`) — platform-agnostic TypeScript: MTGA log
  parser, Scryfall + offline card sources, the draft ranking engine, draw-odds
  helpers, and the `Coach` orchestrator. Consumed by both apps.
- `apps/desktop` (`@mtg-coach/desktop`) — Electron overlay (electron-vite +
  React): transparent, always-on-top window that live-tails `Player.log`.
- `apps/mobile` (`@mtg-coach/mobile`) — Expo / React Native companion (runs on
  Android and web).

## Standard commands

Package scripts are the source of truth; see the root and per-package
`package.json`. Common ones:

- Lint (all): `pnpm lint`
- Test core: `pnpm --filter @mtg-coach/core test` (vitest)
- Build all: `pnpm -r build`
- Desktop dev: `pnpm dev:desktop`  (alias for `pnpm --filter @mtg-coach/desktop dev`)
- Mobile web dev: `pnpm dev:mobile` (alias for `pnpm --filter @mtg-coach/mobile web`)

## Cursor Cloud specific instructions

Dependencies are installed by the startup update script (`pnpm install`); the
notes below are the non-obvious things needed to *run/verify* the apps here.

- **Running the desktop overlay in the VM:** it needs the virtual display and
  the Chromium sandbox disabled:
  `cd apps/desktop && DISPLAY=:1 ELECTRON_DISABLE_SANDBOX=1 pnpm dev`.
  The `ERROR:dbus/bus.cc ... Failed to connect to the bus` lines on startup are
  harmless in this headless VM — the window still renders on `DISPLAY=:1` and is
  visible via computer-use. No extra system packages were required for Electron.
- **DEMO vs LIVE mode:** with no MTGA install present the overlay/companion run
  in DEMO mode using a bundled sample draft. To exercise LIVE log-tailing, point
  it at a file and append MTGA-format lines to it:
  `MTGA_LOG_PATH=/tmp/mtga/Player.log pnpm dev` (the overlay updates as lines are
  appended). The parsable event formats live in `packages/core/src/log/parser.ts`
  and a sample is in `packages/core/src/data/index.ts` (`sampleLogText`).
- **Running the mobile companion (web) in the VM:** `cd apps/mobile && CI=1
  BROWSER=none pnpm web`, then open `http://localhost:8081` in Chrome. `CI=1` is
  important: without it Expo prompts interactively (e.g. "port in use? use 8082")
  and hangs. The first bundle can take ~1 minute; if a reload shows a blank page
  or a `MIME type ('application/json')` error, it is a stale/interrupted Metro
  build — restart with `pnpm exec expo start --web --clear` and let the bundle
  finish (you can pre-warm it by curling the `.bundle` URL from the served
  `index.html`).
- **Imports in `packages/core` must be extensionless** (`./foo`, not `./foo.js`).
  Metro (React Native) does not remap a `.js` specifier to a `.ts` source file,
  so `.js` extensions break the mobile bundle even though Vite/tsc tolerate them.
- **electron-vite bundles the core package:** `apps/desktop/electron.vite.config.ts`
  excludes `@mtg-coach/core` from `externalizeDepsPlugin` because the package's
  `exports` point at TypeScript source; without this the main process would try
  to `require` a `.ts` file at runtime.
- **Native build scripts:** `esbuild` and `electron` are allowlisted under
  `pnpm.onlyBuiltDependencies` in the root `package.json` so `pnpm install` runs
  their postinstall (binary download) non-interactively. Do not run
  `pnpm approve-builds` (interactive).
