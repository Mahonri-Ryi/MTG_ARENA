# MTG Arena Coach

An **MTG Arena overlay + companion** (desktop + Android) that helps you become a
more competitive player — drafting, understanding cards, and finding your best
plays. Inspired by [untapped.gg](https://untapped.gg).

It works the way community trackers do: by tailing MTG Arena's `Player.log`
(with **Detailed Logs (Plugin Support)** enabled) and turning those events into
live pick recommendations and an in-game tracker, plus a card-art-forward
companion for browsing sets and building deck profiles.

---

## Features

- **Draft assistant** — as you draft, it reads the current pack and ranks your
  picks (win‑rate‑style ratings + heuristics for removal/evasion/card advantage,
  and a running two‑color commitment bias), highlighting the recommended card.
- **Match tracker** — turn, on the play/draw, and the opponent's revealed cards.
- **Deck profiles** — paste/import an MTG Arena decklist into a saved profile
  with real card art, a mana curve, color and type breakdowns, and stats.
- **Card collection browser** — browse the full catalog by **set** with
  **color / rarity / type** filters and name search, over real card art (like
  Arena's collection view). Set data is always pulled **live from Scryfall**, so
  new sets appear automatically.

## Apps

| App | What it is | Where |
| --- | --- | --- |
| **Desktop overlay** | Transparent, always‑on‑top Electron window that live‑tails `Player.log` | `apps/desktop` |
| **Mobile companion** | Expo / React Native app (Android + web): Decks, Cards, Draft tabs | `apps/mobile` |
| **Core** | Shared, platform‑agnostic logic: log parser, Scryfall data, ranking, deck/collection tooling | `packages/core` |

---

## Prerequisites

- **Node.js 20+** — <https://nodejs.org> (Node 20 or 22 LTS recommended).
- **pnpm** — this repo uses pnpm workspaces. Enable it via Corepack (bundled
  with Node):

  ```bash
  corepack enable
  ```

  (or `npm install -g pnpm`).
- **Git**.

## Getting started

```bash
git clone https://github.com/Mahonri-Ryi/MTG_ARENA.git
cd MTG_ARENA
pnpm install
```

`pnpm install` installs dependencies for all three packages at once.

---

## Running

### Desktop overlay

```bash
pnpm dev:desktop
```

A transparent, always‑on‑top window opens. On Windows/macOS it auto‑detects MTG
Arena's `Player.log`:

- **Windows:** `%USERPROFILE%\AppData\LocalLow\Wizards Of The Coast\MTGA\Player.log`
- **macOS:** `~/Library/Logs/Wizards Of The Coast/MTGA/Player.log`

If no log is found, the overlay runs in **DEMO** mode with a sample draft so you
can see it working. For real **LIVE** coaching, enable detailed logging in Arena
(see below). You can also point it at a specific file:

```bash
# macOS/Linux
MTGA_LOG_PATH="/path/to/Player.log" pnpm dev:desktop
# Windows (PowerShell)
$env:MTGA_LOG_PATH="C:\path\to\Player.log"; pnpm dev:desktop
```

### Mobile companion — in your browser

```bash
pnpm dev:mobile
```

Then open <http://localhost:8081>. Tip: make the browser window narrow (or use
your browser's device‑toolbar / mobile view) for the intended phone layout.

### Mobile companion — on your phone

```bash
pnpm --filter @mtg-coach/mobile start
```

Install **Expo Go** on your phone and scan the QR code shown in the terminal
(add `--tunnel` if your phone and computer aren't on the same Wi‑Fi). To build a
standalone Android APK instead, install the EAS CLI and build from the mobile
app (uses the profiles in `apps/mobile/eas.json`; requires a free Expo account):

```bash
npm install -g eas-cli
cd apps/mobile
eas build -p android --profile preview
```

---

## Enabling live MTG Arena coaching

1. In MTG Arena, open **Settings → Account**.
2. Enable **Detailed Logs (Plugin Support)**.
3. Restart MTG Arena.

The desktop overlay's badge will switch from **DEMO** to **LIVE** and update as
you draft and play. This log is only produced by the **desktop** MTGA client
(Windows/macOS); the phone companion can't read a game running on the phone
(see *Limitations*).

---

## Project scripts

Run from the repo root:

| Command | Description |
| --- | --- |
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev:desktop` | Run the Electron overlay (dev) |
| `pnpm dev:mobile` | Run the Expo companion for web (dev) |
| `pnpm test` | Run unit tests (core) |
| `pnpm lint` | Lint all packages |
| `pnpm build` | Production build of all packages |

## Tech stack

- **Monorepo:** pnpm workspaces + TypeScript.
- **Core:** TypeScript, [Scryfall API](https://scryfall.com/docs/api) for card
  data, [Vitest](https://vitest.dev) for tests.
- **Desktop:** [Electron](https://www.electronjs.org) +
  [electron‑vite](https://electron-vite.org) + React.
- **Mobile:** [Expo](https://expo.dev) / React Native (+ react‑native‑web).

---

## Limitations

- **No automatic collection/deck sync on the phone.** MTG Arena has no public
  API and mobile apps can't read the game's files, so the Cards browser shows
  the full catalog (not your personal *owned* counts), and deck profiles are
  imported by pasting a decklist. Automatic collection capture requires the
  desktop `Player.log`.
- **Card ratings** shipped in the repo are illustrative; cards outside the small
  bundled sample resolve live from Scryfall (real data + art), which requires an
  internet connection.

## Contributing / development notes

See [`AGENTS.md`](./AGENTS.md) for architecture details, per‑package commands,
and conventions (including the rule that the card catalog must always be sourced
live from Scryfall).
