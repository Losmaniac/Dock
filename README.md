# Glass Dock

A glassmorphism dock and window-control layer for Windows 10/11, built with Tauri 2, Rust and
React. Spec: `AGENTS.md`. Decisions: `docs/adr/`.

```sh
pnpm install
pnpm dev:web        # interactive demo with the mock adapter (any OS)
pnpm dev:desktop    # the real app (Windows, needs Rust + WebView2 + MSVC build tools)

pnpm lint && pnpm typecheck && pnpm test        # TypeScript checks and unit tests
pnpm build:web && pnpm test:e2e                 # browser end-to-end tests (Playwright)
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml -p dock-core   # pure Rust logic, any OS
```

## What it does

- **Docks:** several docks, each on its own monitor and edge, with magnification, auto-hide,
  drag to pin and reorder, running apps merged with pinned ones, live window previews, badges.
- **Window control:** focus, minimize, close, snap layouts, move to monitor, always on top,
  opacity, window switcher, saved workspaces and action chains.
- **Launcher and palette:** apps by Start Menu category, Store apps, recent files, document
  search, Windows settings pages; a keyboard command palette with fuzzy search.
- **Widgets (27):** clock (digital or analog), calendar, stopwatch, focus timer, countdown, world
  clock, calculator, to-do, sticky note, system load, battery, uptime, storage, network and Wi-Fi,
  temperature (when the PC exposes it), volume and mic, now playing, record player, virtual
  desktops, keyboard language, next calendar event, weather, stocks, crypto, currency (ECB),
  market overview, AI provider shortcuts. Each is compact or wide.
- **Looks:** nine themes, glass / frosted / clear finishes, accent from your wallpaper.
- **Taskbar:** optionally hide the native taskbar; it is restored on exit and after a crash.
- **Privacy:** no telemetry, no account. The only network use is the online widgets you add
  (calendar link, weather, stocks, crypto, currency), and only while they are visible.

## Status

Everything is implemented and covered by unit and browser tests, but **the Windows-specific
parts have only been compiled, not run on Windows**. See `docs/perf.md` for the budgets that still
need measuring, and the ADRs for what was deliberately not built (tray icon menus, pin to all
virtual desktops, auto-update, AI usage meters).
