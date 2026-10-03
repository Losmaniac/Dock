# ADR 002: Dock window sizing and native blur

## Context

Native blur (Mica/Acrylic) applies to the whole window rectangle. The dock needs extra
transparent room for magnified icons, tooltips, menus and panels. A transparent window area
also blocks clicks on apps underneath (AGENTS.md pitfall 5).

## Decision

The window is sized per mode by `computeGeometry` (packages/ui) and placed atomically by
`set_dock_geometry` (Rust, pure math in `dock-core::layout`):

- `hidden`: a 4 px hot-edge strip (auto-hide).
- `rest`: the window hugs the bar, so no transparent pixel blocks anything.
- `active`: grows only while the pointer is over the dock or an overlay is open.

The dock window has `WS_EX_NOACTIVATE` (it never steals focus from the app being
controlled) and is removed from Alt+Tab with `WS_EX_TOOLWINDOW`. It becomes focusable only
while the settings panel needs the keyboard.

## Consequences

- While `active`, native blur also covers the extra headroom, so a blurred rectangle larger
  than the bar can be visible behind magnified icons. This is **not verified on hardware**.
- Follow-up if it looks wrong: split into two windows (a blurred bar plus an unblurred
  overlay window), or apply a window region (`SetWindowRgn`) reported by the frontend.
- "Blur: none" and the Solid mode avoid the issue entirely.
