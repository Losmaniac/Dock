# ADR 007: Hiding the native taskbar

Decision (approved by the project owner): the dock can hide the taskbar, off by default, and it
must always come back.

How it is made safe, in order of likelihood:

1. Normal exit and turning the setting off call `restore()`.
2. A panic hook calls `restore()`.
3. Before hiding, the dock writes `%APPDATA%\GlassDock\taskbar-state.json` and starts a **guard
   process** (the same executable with `--taskbar-guard <pid> <flags>`; it creates no window). The
   guard waits for the dock process to end, however it ended, then restores the taskbar. If the guard
   cannot be started, the taskbar is left alone and an error is shown.
4. At every start, a leftover state file whose owner process is gone is undone.
5. The 1 s heartbeat re-hides the taskbar if Explorer brings it back (for example after an
   Explorer restart), as long as hiding is wanted.
6. The UI error boundary also asks for the taskbar back, and the palette has "Show Windows taskbar".

Hiding sets the taskbar to auto-hide (the documented app-bar state flag) and hides its windows.
The previous flags are stored and restored exactly. **Not verified on Windows.**
