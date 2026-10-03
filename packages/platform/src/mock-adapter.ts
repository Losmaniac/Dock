/**
 * MockAdapter: ALL fake data in the project lives here (web demo + design playground).
 * Nothing in this file talks to an OS.
 */
import type {
  BatteryInfo,
  BlurMode,
  DockConfig,
  DockPosition,
  IconSource,
  LaunchItem,
  MediaInfo,
  SnapLayout,
  SystemStats,
  Unsubscribe,
  WindowInfo,
} from "@glass-dock/shared";
import { defaultConfig, parseConfig } from "@glass-dock/shared";
import type { PlatformAPI } from "./platform-api";

const MOCK_APPS = [
  { id: "mock-code", label: "Code", path: "C:\\Mock\\Code.exe", color: "#3b82f6" },
  { id: "mock-browser", label: "Browser", path: "C:\\Mock\\Browser.exe", color: "#f97316" },
  { id: "mock-terminal", label: "Terminal", path: "C:\\Mock\\Terminal.exe", color: "#22c55e" },
  { id: "mock-notes", label: "Notes", path: "C:\\Mock\\Notes.exe", color: "#eab308" },
] as const;

const STORAGE_KEY = "glass-dock:config";

function mockIcon(label: string, color: string): string {
  const letter = label.slice(0, 1).toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#111827"/></linearGradient></defs>` +
    `<rect width="64" height="64" rx="14" fill="url(#g)"/>` +
    `<text x="32" y="43" font-family="Segoe UI, sans-serif" font-size="32" font-weight="600" ` +
    `text-anchor="middle" fill="#fff">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export class MockAdapter implements PlatformAPI {
  private windows: WindowInfo[] = MOCK_APPS.slice(0, 2).map((a, i) => ({
    hwnd: String(1000 + i),
    title: `${a.label} (mock window)`,
    processName: `${a.label}.exe`,
    processPath: a.path,
    focused: i === 0,
    minimized: false,
    elevated: false,
  }));
  private windowListeners = new Set<(w: WindowInfo[]) => void>();
  private config: DockConfig = this.readStoredConfig();

  private readStoredConfig(): DockConfig {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (raw) return parseConfig(JSON.parse(raw)).config;
    } catch {
      /* storage unavailable or corrupt: use the seeded defaults */
    }
    return this.seedConfig();
  }

  private seedConfig(): DockConfig {
    return {
      ...defaultConfig(),
      items: MOCK_APPS.map((a) => ({
        id: a.id,
        type: "app" as const,
        label: a.label,
        path: a.path,
        args: [],
      })),
    };
  }

  private emitWindows(): void {
    const snapshot = this.windows.map((w) => ({ ...w }));
    this.windowListeners.forEach((cb) => cb(snapshot));
  }

  private mutate(hwnd: string, fn: (w: WindowInfo) => void): Promise<void> {
    const w = this.windows.find((x) => x.hwnd === hwnd);
    if (w) fn(w);
    this.emitWindows();
    return Promise.resolve();
  }

  listWindows = () => Promise.resolve(this.windows.map((w) => ({ ...w })));
  focusWindow = (hwnd: string) =>
    this.mutate(hwnd, (w) => {
      this.windows.forEach((x) => (x.focused = false));
      w.focused = true;
      w.minimized = false;
    });
  minimizeWindow = (hwnd: string) =>
    this.mutate(hwnd, (w) => {
      w.minimized = true;
      w.focused = false;
    });
  closeWindow = (hwnd: string) => {
    this.windows = this.windows.filter((w) => w.hwnd !== hwnd);
    this.emitWindows();
    return Promise.resolve();
  };
  snapWindow = (_hwnd: string, _layout: SnapLayout) => Promise.resolve();
  moveWindowToMonitor = (_hwnd: string, _monitorId: string) => Promise.resolve();
  setAlwaysOnTop = (_hwnd: string, _on: boolean) => Promise.resolve();
  setWindowOpacity = (_hwnd: string, _value: number) => Promise.resolve();

  onWindowsChanged(cb: (w: WindowInfo[]) => void): Unsubscribe {
    this.windowListeners.add(cb);
    return () => this.windowListeners.delete(cb);
  }

  launch(item: LaunchItem): Promise<void> {
    if (item.type === "app") {
      const app = MOCK_APPS.find((a) => a.path === item.path);
      if (app && !this.windows.some((w) => w.processPath === app.path)) {
        this.windows.forEach((x) => (x.focused = false));
        this.windows.push({
          hwnd: String(2000 + this.windows.length),
          title: `${app.label} (mock window)`,
          processName: `${app.label}.exe`,
          processPath: app.path,
          focused: true,
          minimized: false,
          elevated: false,
        });
        this.emitWindows();
      }
    }
    return Promise.resolve();
  }

  getIcon(source: IconSource): Promise<string> {
    const path = "path" in source ? source.path : source.aumid;
    const app = MOCK_APPS.find((a) => a.path === path);
    return Promise.resolve(
      mockIcon(app?.label ?? path.split("\\").pop() ?? "?", app?.color ?? "#6b7280"),
    );
  }

  registerHotkey = (_accelerator: string, _actionId: string) => Promise.resolve();

  getSystemStats(): Promise<SystemStats> {
    const t = Date.now() / 1000;
    return Promise.resolve({
      cpuPercent: 30 + 20 * Math.sin(t / 3),
      ramPercent: 55 + 5 * Math.sin(t / 11),
      diskPercent: 62,
      netUpBytesPerSec: 20_000 + 10_000 * Math.sin(t),
      netDownBytesPerSec: 400_000 + 200_000 * Math.sin(t / 2),
    });
  }
  getBattery = (): Promise<BatteryInfo | null> => Promise.resolve({ percent: 78, charging: false });
  getNowPlaying = (): Promise<MediaInfo | null> =>
    Promise.resolve({ title: "Mock Track", artist: "Mock Artist", playing: true });
  onNowPlaying(cb: (m: MediaInfo | null) => void): Unsubscribe {
    void this.getNowPlaying().then(cb);
    return () => {};
  }

  setDockPosition = (_pos: DockPosition) => Promise.resolve();
  setAutoHide = (_on: boolean) => Promise.resolve();
  setBlurMode = (_mode: BlurMode) => Promise.resolve();

  loadConfig = () => Promise.resolve(structuredClone(this.config));
  saveConfig(cfg: DockConfig): Promise<void> {
    this.config = structuredClone(cfg);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      /* ignore: demo still works in memory */
    }
    return Promise.resolve();
  }
}
