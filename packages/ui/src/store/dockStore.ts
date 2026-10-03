import { create } from "zustand";
import type {
  DockConfig,
  DockDef,
  DockItem,
  MonitorInfo,
  PathInfo,
  WindowInfo,
} from "@glass-dock/shared";
import { defaultConfig, type WidgetKind } from "@glass-dock/shared";
import type { PlatformAPI } from "@glass-dock/platform";
import { currentDock } from "../lib/docks";
import type { Open } from "../lib/overlay";

export interface Toast {
  id: number;
  text: string;
}

interface DockState {
  platform: PlatformAPI | null;
  ready: boolean;
  config: DockConfig;
  /** Which dock this window shows; null = the main window (first dock). */
  dockId: string | null;
  windows: WindowInfo[];
  monitors: MonitorInfo[];
  open: Open | null;
  /** Keyboard navigation inside the dock; makes the window focusable while true. */
  keyboardMode: boolean;
  setKeyboardMode(on: boolean): void;
  setOpen(o: Open | null): void;
  toggleWidget(widget: WidgetKind, on: boolean): void;
  setWidgetSize(widget: WidgetKind, size: "compact" | "wide"): void;
  icons: Record<string, string>;
  toasts: Toast[];
  init(platform: PlatformAPI, dockId?: string | null): () => void;
  edit(fn: (draft: DockConfig) => void): void;
  /** Edit the dock shown by this window. */
  editDock(fn: (dock: DockDef, draft: DockConfig) => void): void;
  setConfig(cfg: DockConfig): void;
  reorder(ids: string[]): void;
  pinPath(info: PathInfo): void;
  pinRunning(label: string, path: string, aumid: string | null): void;
  unpin(id: string): void;
  loadIcon(key: string, source: { path: string } | { aumid: string }): void;
  report(error: unknown): void;
}

let toastId = 0;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const messageOf = (e: unknown): string =>
  typeof e === "object" && e && "message" in e
    ? String((e as { message: unknown }).message)
    : String(e);

const uid = () => crypto.randomUUID();

export const useDock = create<DockState>((set, get) => {
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      get()
        .platform?.saveConfig(get().config)
        .catch((e) => get().report(e));
    }, 400);
  };

  return {
    platform: null,
    ready: false,
    config: defaultConfig(),
    dockId: null,
    windows: [],
    monitors: [],
    open: null,
    keyboardMode: false,
    setKeyboardMode: (keyboardMode) => set({ keyboardMode }),
    setOpen: (open) => set({ open }),
    icons: {},
    toasts: [],

    init(platform, dockId = null) {
      set({ platform, dockId });
      let alive = true;
      void platform.loadConfig().then((config) => alive && set({ config, ready: true }));
      void platform.listWindows().then((windows) => alive && set({ windows }));
      void platform.getMonitors().then((monitors) => alive && set({ monitors }));
      const off = platform.onWindowsChanged((windows) => set({ windows }));
      const offMon = platform.onMonitorsChanged((monitors) => set({ monitors }));
      // Another dock window saved a change: adopt it without saving again (no echo loop).
      const offCfg = platform.onConfigChanged((config) => alive && set({ config }));
      return () => {
        alive = false;
        off();
        offMon();
        offCfg();
      };
    },

    edit(fn) {
      const draft = structuredClone(get().config);
      fn(draft);
      set({ config: draft });
      save();
    },

    editDock(fn) {
      get().edit((d) => fn(currentDock(d, get().dockId), d));
    },

    setConfig(config) {
      set({ config });
      save();
    },

    reorder(ids) {
      get().editDock((dock) => {
        const byId = new Map(dock.items.map((i) => [i.id, i]));
        dock.items = ids.map((id) => byId.get(id)).filter((i): i is DockItem => !!i);
      });
    },

    setWidgetSize(widget, size) {
      get().editDock((dock) => {
        for (const i of dock.items) if (i.type === "widget" && i.widget === widget) i.size = size;
      });
    },

    toggleWidget(widget, on) {
      get().editDock((dock) => {
        const has = dock.items.some((i) => i.type === "widget" && i.widget === widget);
        if (on && !has)
          dock.items.push({ id: uid(), type: "widget", widget, size: "compact", options: {} });
        if (!on)
          dock.items = dock.items.filter((i) => !(i.type === "widget" && i.widget === widget));
      });
    },

    pinPath(info) {
      get().editDock((dock) => {
        const lower = info.path.toLowerCase();
        if (dock.items.some((i) => "path" in i && i.path.toLowerCase() === lower)) return;
        if (info.kind === "app") {
          dock.items.push({
            id: uid(),
            type: "app",
            label: info.label,
            path: info.path,
            args: info.args,
          });
        } else if (info.kind === "folder") {
          dock.items.push({ id: uid(), type: "folder", label: info.label, path: info.path });
        }
      });
    },

    pinRunning(label, path, aumid) {
      get().editDock((dock) => {
        dock.items.push({
          id: uid(),
          type: "app",
          label,
          path,
          args: [],
          ...(aumid ? { aumid } : {}),
        });
      });
    },

    unpin(id) {
      get().editDock((dock) => {
        dock.items = dock.items.filter((i) => i.id !== id);
      });
    },

    loadIcon(key, source) {
      const { platform, icons } = get();
      if (!platform || key in icons) return;
      set({ icons: { ...icons, [key]: "" } }); // mark in flight
      platform
        .getIcon(source)
        .then((url) => set((s) => ({ icons: { ...s.icons, [key]: url } })))
        .catch(() => set((s) => ({ icons: { ...s.icons, [key]: "" } })));
    },

    report(error) {
      const t = { id: ++toastId, text: messageOf(error) };
      set((s) => ({ toasts: [...s.toasts, t] }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== t.id) })), 5000);
    },
  };
});

/** The dock shown by this window (the first dock for the main window). */
export const useCurrentDock = (): DockDef => useDock((s) => currentDock(s.config, s.dockId));
