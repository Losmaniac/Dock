# Glass Dock

Glassmorphism dock and window-control layer for Windows 10/11 (Tauri 2 + React). The spec and
roadmap are in `AGENTS.md`; decisions are in `docs/adr/`.

```sh
pnpm install
pnpm dev:web        # interactive demo with the mock adapter (any OS)
pnpm dev:desktop    # Tauri shell (Windows, needs Rust + WebView2)
pnpm lint && pnpm typecheck && pnpm test && pnpm build:web
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml -p dock-core   # pure logic, any OS
```

## Status

Phases 0 to 4 are implemented. **Everything Windows-specific compiles but has not been run on
Windows**: see "Not verified" below.

| Area                                                                          | State                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------ |
| Dock, running windows, focus / minimize / close, icons, drag to pin / reorder | Implemented                                |
| Snap, move to monitor, always on top, opacity                                 | Implemented                                |
| CPU / RAM / disk / network, battery, now playing, volume                      | Implemented                                |
| Hotkeys, command palette, window switcher, workspaces and action chains       | Implemented                                |
| Hover previews (DWM thumbnails), notification badges                          | Implemented (badges are a title heuristic) |
| AppBar space reservation, fullscreen hiding, single monitor choice            | Implemented, off or automatic              |
| Presets, import / export, autostart, NSIS + MSI installers                    | Implemented, installers unsigned           |
| Calendar (ICS) and weather widgets                                            | Implemented, opt-in                        |
| Dock on every monitor, pin to all virtual desktops, auto-update               | **Not implemented** (ADR 003, 004, 005)    |

## Not verified (needs a Windows machine)

Native blur appearance, startup flash, click-through, focus stealing behavior, AppBar,
thumbnails, SMTC, audio, hotkey conflicts, installer size, and every Section 7 budget
(see `docs/perf.md`).
