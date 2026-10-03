# Performance and budgets (AGENTS.md section 7)

This environment is Linux, so Windows-only budgets could not be measured. Numbers below are
labelled with how they were obtained. Re-measure on Windows before trusting any of them.

| Budget                                                | Result                                               | How measured                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Animation frame rate during magnification             | 60 fps (p50 16,7 ms, p95 16,8 ms, 88 frames)         | Headless Chromium, software rendering, pointer sweep over the web demo. **Not WebView2, not a GPU.** |
| Hover to magnification response (< 16 ms)             | Not measured                                         | Needs real input latency tooling                                                                     |
| Command palette result time (< 50 ms for 1 000 items) | Passes                                               | Unit test `fuzzy.test.ts` asserts the ranking of 1 000 items takes under 50 ms                       |
| Web bundle                                            | 416 kB JS (127,6 kB gzip), 14,8 kB CSS (3,9 kB gzip) | `pnpm build:web`                                                                                     |
| Cold start to visible dock (< 1 000 ms)               | **Not measured**                                     | Needs the Windows build                                                                              |
| Idle CPU (< 1 %) and idle RAM (<= 150 MB)             | **Not measured**                                     | Needs the Windows build with WebView2                                                                |
| Window list update after open/close (< 100 ms)        | **Not measured**                                     | Design: WinEvent hook, 40 ms coalescing, so the floor is about 40 ms plus enumeration                |
| Installer size (< 15 MB)                              | **Not measured**                                     | The `release` workflow prints sizes after building                                                   |

## Idle-cost design

- No frontend polling for window state; WinEvent hooks feed one Rust thread.
- That thread wakes at most once per second when idle (fullscreen + monitor checks).
- Widgets poll only while mounted and visible: stats 1 000 ms, audio 2 000 ms, now playing
  1 500 ms, battery 30 s, calendar 15 min, weather 30 min.
- Magnification caches each item's center on pointer enter instead of reading layout on every
  pointer move.

## Added with the widget set

- Every widget polls only while it is visible (the dock is not hidden): stats 1 000 ms, audio
  2 000 ms, network and temperature 5 s, desktops 1,5 s, keyboard language 1 000 ms, disks and uptime
  30 s, battery 30 s, quotes 5 min, crypto 2 min, ECB rates 6 h, calendar 15 min, weather 30 min.
- The launcher's file index is built on a background thread (at most 60 000 names, depth 5) the first
  time document search is used, and refreshed at most every 5 minutes. **Memory cost not measured.**
- Start Menu and Store apps are listed on demand and cached for 5 minutes; Store apps need one
  PowerShell call (about a second on the first open).
- Window thumbnails, the record player, and `Get-StartApps` have **not been profiled on Windows**.
