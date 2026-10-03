import { useDock } from "../store/dockStore";
import { Btn } from "../widgets/ui";

export const WELCOME_SIZE = { w: 520, h: 430 };

const TIPS: [string, string][] = [
  ["Drag an app, shortcut or folder onto the dock", "to pin it"],
  ["Right-click an app", "snap, always on top, opacity, move to monitor"],
  ["Right-click empty dock space", "open settings"],
  ["Hover a running app", "live window preview"],
];

/** Shown once, on the first run. Everything here is also reachable from Settings. */
export function Welcome({ close }: { close: () => void }) {
  const hotkeys = useDock((s) => s.config.hotkeys);
  const toggleWidget = useDock((s) => s.toggleWidget);
  const finish = () => {
    useDock.getState().edit((d) => void (d.system.onboarded = true));
    close();
  };
  const keys: [string, string][] = [
    [hotkeys.launcher, "Launcher: apps, files, settings"],
    [hotkeys.commandPalette, "Command palette"],
    [hotkeys.switcher, "Window switcher"],
    [hotkeys.toggleDock, "Hide or show the dock"],
    [hotkeys.focusDock, "Use the dock with the keyboard"],
  ];
  return (
    <div
      className="panel flex flex-col gap-3 p-5 text-sm"
      style={{ width: WELCOME_SIZE.w, height: WELCOME_SIZE.h }}
      role="dialog"
      aria-label="Welcome"
    >
      <h2 className="text-lg font-semibold">Welcome to Glass Dock</h2>
      <ul className="space-y-0.5 opacity-90">
        {TIPS.map(([a, b]) => (
          <li key={a}>
            <span className="font-medium">{a}</span> <span className="opacity-70">· {b}</span>
          </li>
        ))}
      </ul>
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
          Shortcuts
        </div>
        <ul className="grid grid-cols-1 gap-0.5">
          {keys
            .filter(([k]) => k)
            .map(([k, label]) => (
              <li key={label} className="flex justify-between">
                <span>{label}</span>
                <kbd className="rounded bg-white/15 px-1.5 text-xs">{k}</kbd>
              </li>
            ))}
        </ul>
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
          Quick start
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn
            onClick={() =>
              (["clock", "system-stats", "volume", "battery"] as const).forEach((w) =>
                toggleWidget(w, true),
              )
            }
          >
            Add clock, system, volume, battery
          </Btn>
          <Btn
            onClick={() => {
              finish();
              useDock.getState().setOpen({ kind: "launcher" });
            }}
          >
            Open launcher
          </Btn>
          <Btn
            onClick={() => {
              finish();
              useDock.getState().setOpen({ kind: "settings" });
            }}
          >
            Settings
          </Btn>
        </div>
      </div>
      <div className="mt-auto flex justify-end">
        <Btn primary onClick={finish}>
          Got it
        </Btn>
      </div>
    </div>
  );
}
