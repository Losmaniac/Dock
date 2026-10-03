# ADR 003: Phase 2 scope decisions

## AppBar space reservation

Implemented behind `dock.reserveSpace` (off by default). Uses `ABM_NEW / QUERYPOS / SETPOS`
and is released with `ABM_REMOVE` on exit, when the setting is turned off, and while auto-hide
is active (a hidden dock cannot own an edge). If the process is killed, Windows drops the
registration with the process. **Not verified on hardware.** The native taskbar is never touched.

## Multi-monitor

The dock lives on **one** monitor: primary, or one chosen by device name (falls back to
primary when unplugged). Layout changes are detected by a 1 s heartbeat in the Rust event
thread (`monitors-changed`), which also checks for fullscreen apps. "Dock on every monitor"
needs one webview per monitor with shared state and is **not implemented**.
DPI: each monitor's scale comes from `GetDpiForMonitor`; Tauri/tao run the process as
per-monitor DPI aware.

## Polling

There is no frontend polling for window state (WinEvent hooks). Allowed polling, all stopped
when nothing is visible: system stats 1 000 ms, battery 30 s, now playing 1,5 s. SMTC has no
cheap push channel in this binding, so now-playing polls only while a widget is mounted.

## Fullscreen

`SHQueryUserNotificationState` is checked every second; the window is hidden while a
fullscreen app, D3D game or presentation runs, and restored afterwards.

## Hotkeys

Registered in Rust through `tauri-plugin-global-shortcut`. Failures (already taken, bad
syntax) are returned to the UI and shown as a toast. `toggle-dock` is handled in Rust so it
works even while the webview is hidden.
