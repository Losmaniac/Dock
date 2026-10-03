# ADR 006: Multiple docks, and what "system tray" means here

## Multiple docks

Config version 2 holds `docks[]`. Each dock has its own monitor, position, size, auto-hide,
space reservation and items; appearance, hotkeys, workspaces and integrations are shared.

- The **first dock** runs in the `main` window. Every other dock gets its own `dock-<id>` window,
  created and destroyed by the Rust command `sync_dock_windows`, which only the main window calls.
- A window learns its dock from its **window label**, not from a URL query, so production builds
  do not depend on how the asset protocol handles query strings.
- All windows read the same config file. A save is broadcast as `config-changed`; a window
  with unsaved local edits ignores the broadcast, and an echo of its own save is a no-op, so
  dragging a slider never jumps back.
- Global things happen once: hotkeys and taskbar hiding belong to the main window; window
  visibility (toggle hotkey, fullscreen hiding) applies to every dock window; AppBar
  reservations and DWM previews are tracked per window.
- A v1 config migrates to a single dock; nothing is split up behind your back. Add more docks
  in Settings, or "Add a dock on every other monitor".

## System tray

Windows has no supported API for showing or operating other apps' tray icons from another
process. Doing it needs either becoming the shell's `Shell_TrayWnd` (which replaces Explorer's
taskbar and breaks things when it fails) or driving the real taskbar through UI Automation (which
does not work while the taskbar is hidden). Neither can be made safe without testing on real
machines, so **tray icon menus are not implemented**. What the dock offers instead are the system
indicators as widgets: volume and microphone, battery, network and Wi-Fi, keyboard language,
clock, virtual desktops.
