# ADR 005: Pin to all virtual desktops is not implemented

## Context

AGENTS.md lists "pin to all virtual desktops" as experimental (phase 4) and notes that no
stable public API exists.

## Findings

- The documented `IVirtualDesktopManager` can only query a window's desktop
  (`IsWindowOnCurrentVirtualDesktop`, `GetWindowDesktopId`) and move windows **owned by the
  calling process** (`MoveWindowToDesktop`). It cannot pin another app's window.
- Pinning another process's window requires the undocumented
  `IVirtualDesktopPinnedApps` / `IApplicationViewCollection` COM interfaces. Their GUIDs and
  vtable layouts change between Windows 10 and several Windows 11 builds.

## Decision

Not implemented. Shipping calls into undocumented vtables that I cannot test on the target
Windows builds risks crashing the host process or doing nothing. No UI exposes the feature.

## If revisited

Behind an `experimental.pinAllDesktops` flag, resolve the interface GUIDs per Windows build
number from a table verified on real machines, call inside an isolated helper process so a
failure cannot take the dock down, and add a hard kill-switch in settings.
