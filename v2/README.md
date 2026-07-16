# ABI Randomizer v2.0

Full rebuild per `Planungs.md` — new IA, new design system, new component-based
architecture, no framework, no build step. Lives in `/v2/` **next to** the
still-fully-functional v1 (root `index.html`, `randomizer.html`, etc.) per the
plan's "Parallelaufbau statt Umbau" strategy (§10): v1 is untouched except for
a handful of purely additive `export` keywords added to already-pure v1
functions so v2 could reuse them instead of reimplementing them (see
"Reused from v1" below).

## Running it

No build step. Serve the repo root with any static file server and open
`/v2/index.html` (module scripts need `http://`, not `file://`).

```
python -m http.server 8080
# open http://localhost:8080/v2/index.html
```

## Self-checks

`/v2/test.html` runs the assert-based checks for every core engine (no test
framework, same pattern as `assets/js/randomizer/squad-utils.test.js`) and
prints PASS/FAIL per suite plus a summary line.

## Architecture

```
View → Actions → Store → Core/Services
  ↑                 │
  └──── Render ←────┘
```

- **`assets/js/app/`** — `router.js` (hash router, dynamic `import()` per
  view), `store.js` + `app-store.js` (single shared state singleton —
  currently holds `route` and `squad`), `bootstrap.js` (shell chrome + SW
  registration).
- **`assets/js/core/`** — pure logic, zero DOM: `randomizer-engine.js`,
  `filters.js`, `gungame-engine.js`, `muschel-engine.js`, `storage.js`
  (versioned schema, its own `abi-randomizer:v2` namespace — separate from
  v1's raw localStorage keys, so v1 keeps running unaffected).
- **`assets/js/services/`** — `squad-service.js`, the only place in v2 that
  touches Firebase. It's a lazily-constructed singleton (`getSquadService()`)
  so the connection survives navigating between views, and Firebase itself
  only downloads once Squad is actually opened (dynamic import chain:
  router → `squad-view.js` → `squad-service.js` → v1's `squad.js` →
  `firebase.js`).
- **`assets/js/components/`** — `sheet.js` (Sheet/Drawer, focus trap + focus
  return), `event-overlay.js` (single-button event dialogs *and*
  confirm/cancel dialogs, same focus handling).
- **`assets/js/views/`** — one file per route: `hub-view.js`,
  `randomizer-view.js`, `filters-view.js` (opened as a Sheet, not a route),
  `wheel-view.js`, `squad-view.js`, `gungame-view.js`, `muschel-view.js`.
- **`assets/styles/`** — `tokens.css` → `reset.css` → `base.css` →
  `shell.css` → `components/*.css` → `views/*.css`, all loaded upfront (no
  bundler to split per-route yet — see Known gaps).

### Reused from v1 (Planungs.md §3 — "nur fachlich bewährte Daten und
Kernfunktionen")

| v2 module | Reuses from v1 |
| --- | --- |
| `core/randomizer-engine.js` | `randomizer/game.js` (weighted random, history), `randomizer/data.js` (all pools) |
| `core/filters.js` | `randomizer/data.js` |
| `services/squad-service.js` | `randomizer/squad.js`, `randomizer/squad-utils.js` (pure Firebase/validation logic, unchanged) |
| `views/wheel-view.js` | `randomizer/wheel.js`'s pure canvas-drawing + value-sanitizing functions (exported additively — v1's DOM-coupled `initializeWheelSpin` was **not** reused, per Phase 4's own "Wheel-Logik vom DOM entkoppeln" task) |
| `views/muschel-view.js` | `randomizer/sound.js`'s `playmuschelDecisionSound` |
| `core/gungame-engine.js` | **Not** imported from `gungame/gungame.js` — that file runs a DOM-coupled `initialize()` at import time and would crash outside v1's page. Reimplemented fresh against the same `gungame/data.js` pool instead. |

## Decisions taken (Planungs.md §13)

1. **No build step** (Vite) — confirmed by you. Plain ES modules.
2. **`/v2/` folder**, not a branch — no branching was in scope this session.
3. **Fixed sidebar** on desktop, not a collapsible rail.
4. **Typographic/icon-based** Loadout Board — no item-image asset pipeline exists.
5. **Miesmuschel available immediately** — matches the reactivation already done on v1's hub earlier this project.
6. **Clean v2 filter profile**, not a full v1-filter migration — Filter Studio starts from `getDefaultFilters()`.
7. Fonts: **system font stack**, not self-hosted/subsetted — no font files were available to embed. This satisfies "no render-blocking Google Fonts request" but not literally "locally hosted, subsetted" from §6. Flagged, not silently claimed done.

## Known gaps against the Definition of Done (§12)

- **CSS is not split per route** — no bundler, so every view's CSS loads on
  every page. Still within the 35 KB budget (~26 KB total) but not truly
  code-split.
- **No real Lighthouse/cross-browser/device-matrix testing** — no browser
  tooling available in this environment. Byte budgets were checked by hand
  (`wc -c`); LCP/INP/CLS numbers, real contrast-ratio audits, and the
  Chrome/Firefox/Edge/Safari matrix from §11 were not run.
- **No v1 → v2 data migration** — v2 starts with a clean profile (decision
  6 above). Reading and transforming v1's actual saved localStorage data
  is a separate, not-yet-built task.
- **Settings view** is live (`#/settings`): master volume (v1's `sound.js`),
  manual reduced-motion override, streamer mode (off/transparent/
  greenscreen), and a confirm-gated "Daten zurücksetzen" that wipes the v2
  profile (not the live Squad session).
- **v1 is not retired** — both versions run side by side; deleting v1's
  HTML/CSS/JS is explicitly the last DoD item, gated on v2 being reviewed
  and accepted first.
