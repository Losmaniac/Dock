/**
 * MockAdapter: ALL fake data in the project lives here (web demo + design playground).
 * Nothing in this file talks to an OS.
 */
import type {
  AudioState,
  BatteryInfo,
  DocHit,
  RecentFile,
  StartApp,
  DiskInfo,
  NetworkInfo,
  TemperatureReading,
  VirtualDesktops,
  BlurMode,
  DockConfig,
  DockGeometry,
  DockPosition,
  FolderEntry,
  PathInfo,
  PixelRect,
  Placement,
  IconSource,
  MediaAction,
  MonitorInfo,
  LaunchItem,
  MediaInfo,
  SnapLayout,
  SystemStats,
  Unsubscribe,
  WindowInfo,
} from "@glass-dock/shared";
import { defaultConfig, parseConfig } from "@glass-dock/shared";
import { matchesAccelerator } from "./accelerator";
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
    topmost: false,
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
      items: [
        ...MOCK_APPS.map((a) => ({
          id: a.id,
          type: "app" as const,
          label: a.label,
          path: a.path,
          args: [],
        })),
        { id: "mock-sep", type: "separator" as const },
        {
          id: "mock-clock",
          type: "widget" as const,
          widget: "clock" as const,
          size: "compact" as const,
          options: {},
        },
        {
          id: "mock-stats",
          type: "widget" as const,
          widget: "system-stats" as const,
          size: "compact" as const,
          options: {},
        },
        {
          id: "mock-media",
          type: "widget" as const,
          widget: "now-playing" as const,
          size: "compact" as const,
          options: {},
        },
      ],
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
  setAlwaysOnTop = (hwnd: string, on: boolean) => this.mutate(hwnd, (w) => void (w.topmost = on));
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
          topmost: false,
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

  private hotkeys = new Map<string, string>(); // actionId -> accelerator
  private hotkeyListeners = new Set<(id: string) => void>();
  private keydown = (e: KeyboardEvent) => {
    for (const [id, accel] of this.hotkeys) {
      if (matchesAccelerator(e, accel)) {
        e.preventDefault();
        this.hotkeyListeners.forEach((cb) => cb(id));
        return;
      }
    }
  };
  /** Web demo: in-page key handling stands in for OS-wide hotkeys. */
  registerHotkey(accelerator: string, actionId: string): Promise<void> {
    if (!accelerator.trim()) this.hotkeys.delete(actionId);
    else {
      for (const [id, a] of this.hotkeys) {
        if (id !== actionId && a.toLowerCase() === accelerator.toLowerCase())
          return Promise.reject({
            code: "invalid_argument",
            message: `"${accelerator}" is already used by another action.`,
          });
      }
      this.hotkeys.set(actionId, accelerator);
    }
    return Promise.resolve();
  }
  onHotkey(cb: (actionId: string) => void): Unsubscribe {
    if (this.hotkeyListeners.size === 0) globalThis.addEventListener?.("keydown", this.keydown);
    this.hotkeyListeners.add(cb);
    return () => {
      this.hotkeyListeners.delete(cb);
      if (this.hotkeyListeners.size === 0)
        globalThis.removeEventListener?.("keydown", this.keydown);
    };
  }

  getStartApps = (): Promise<StartApp[]> =>
    Promise.resolve([
      ...MOCK_APPS.map((a) => ({ name: a.label, path: a.path, aumid: null, category: "Apps" })),
      { name: "Paint", path: "C:\\Mock\\Paint.lnk", aumid: null, category: "Accessories" },
      { name: "Calculator", path: "C:\\Mock\\Calc.lnk", aumid: null, category: "Accessories" },
      { name: "Photos", path: null, aumid: "Mock.Photos!App", category: "Store apps" },
      { name: "Word", path: "C:\\Mock\\Word.lnk", aumid: null, category: "Office" },
    ]);
  getRecentFiles = (): Promise<RecentFile[]> =>
    Promise.resolve([
      { name: "Quarterly report.docx", path: "C:\\Mock\\Quarterly report.docx", isDir: false },
      { name: "Budget.xlsx", path: "C:\\Mock\\Budget.xlsx", isDir: false },
      { name: "Projects", path: "C:\\Mock\\Projects", isDir: true },
    ]);
  searchDocuments = (query: string): Promise<DocHit[]> =>
    Promise.resolve(
      ["Report draft.docx", "Report final.pdf", "Holiday photos", "notes.txt"]
        .filter((n) => n.toLowerCase().includes(query.trim().toLowerCase()))
        .map((n) => ({ name: n, path: `C:\\Mock\\${n}`, isDir: !n.includes(".") })),
    );
  describePath = (path: string): Promise<PathInfo> =>
    Promise.resolve({ kind: "file", label: path.split(/[\\/]/).pop() ?? path, path, args: [] });
  listFolder = (_path: string): Promise<FolderEntry[]> =>
    Promise.resolve(
      ["Docs", "Photos", "notes.txt", "todo.md", "budget.xlsx"].map((name, i) => ({
        name,
        path: `C:\\Mock\\${name}`,
        isDir: i < 2,
      })),
    );
  /** The browser cannot receive OS file paths, so the web demo never fires this. */
  onFilesDropped(_cb: (paths: string[], point: { x: number; y: number }) => void): Unsubscribe {
    return () => {};
  }

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
    Promise.resolve({
      title: "Mock Track",
      artist: "Mock Artist",
      playing: true,
      positionMs: Date.now() % 180_000,
      durationMs: 180_000,
    });
  onNowPlaying(cb: (m: MediaInfo | null) => void): Unsubscribe {
    void this.getNowPlaying().then(cb);
    return () => {};
  }

  getDisks = (): Promise<DiskInfo[]> =>
    Promise.resolve([
      { mount: "C:\\", name: "System", total: 512e9, available: 190e9, removable: false },
      { mount: "D:\\", name: "Data", total: 2e12, available: 1.4e12, removable: false },
    ]);
  getUptime = () => Promise.resolve(3 * 86_400 + 5 * 3600 + 120);
  getTemperatures = (): Promise<TemperatureReading[]> =>
    Promise.resolve([{ label: "CPU (demo)", celsius: 54 }]);
  getNetwork = (): Promise<NetworkInfo> =>
    Promise.resolve({
      adapters: [{ name: "Ethernet", ips: ["192.168.1.20"] }],
      wifi: { ssid: "Demo Wi-Fi", signal: 78 },
    });
  private desktop = 0;
  getVirtualDesktops = (): Promise<VirtualDesktops> =>
    Promise.resolve({ count: 3, current: this.desktop });
  switchVirtualDesktop = (d: "left" | "right") => {
    this.desktop = Math.min(2, Math.max(0, this.desktop + (d === "right" ? 1 : -1)));
    return Promise.resolve();
  };
  getMediaCover = () => Promise.resolve<string | null>(null);

  /** Web demo: a drawn gradient stands in for a wallpaper. */
  getWallpaper(): Promise<string | null> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="36"><defs><linearGradient id="g"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs><rect width="64" height="36" fill="url(#g)"/></svg>`;
    return Promise.resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  }

  private audio: AudioState = { volume: 0.4, muted: false, micMuted: false };
  getAudio = () => Promise.resolve({ ...this.audio });
  setVolume = (volume: number) => {
    this.audio.volume = Math.min(1, Math.max(0, volume));
    return Promise.resolve();
  };
  setMuted = (target: "output" | "input", muted: boolean) => {
    if (target === "output") this.audio.muted = muted;
    else this.audio.micMuted = muted;
    return Promise.resolve();
  };

  capturePlacement = (_hwnd: string): Promise<Placement | null> =>
    Promise.resolve({
      monitorId: "\\\\.\\DISPLAY1",
      x: 0.1,
      y: 0.1,
      w: 0.5,
      h: 0.6,
      maximized: false,
    });
  placeWindow = (_hwnd: string, _p: Placement) => Promise.resolve();

  showThumbnail = (_hwnd: string, _rect: PixelRect) => Promise.resolve();
  hideThumbnails = () => Promise.resolve();

  /** Web demo: canned feeds, so no real request is made. */
  fetchText(url: string): Promise<string> {
    if (url.includes("openweathermap"))
      return Promise.resolve(
        JSON.stringify({
          name: "Demo City",
          main: { temp: 17.4 },
          weather: [{ description: "light rain" }],
        }),
      );
    const t = new Date(Date.now() + 90 * 60_000);
    const p = (n: number) => String(n).padStart(2, "0");
    const stamp = `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00Z`;
    return Promise.resolve(
      `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:${stamp}\r\nSUMMARY:Design review (demo)\r\nEND:VEVENT\r\nEND:VCALENDAR`,
    );
  }

  private autostart = false;
  getAutostart = () => Promise.resolve(this.autostart);
  setAutostart = (on: boolean) => {
    this.autostart = on;
    return Promise.resolve();
  };
  /** Web demo: triggers a browser download. */
  exportConfig(json: string): Promise<string> {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "glass-dock-config.json";
    a.click();
    URL.revokeObjectURL(url);
    return Promise.resolve("your downloads folder");
  }

  mediaControl = (_action: MediaAction) => Promise.resolve();
  getMonitors = (): Promise<MonitorInfo[]> =>
    Promise.resolve([
      { id: "\\\\.\\DISPLAY1", primary: true, width: 1920, height: 1080, scale: 1 },
      { id: "\\\\.\\DISPLAY2", primary: false, width: 2560, height: 1440, scale: 1.5 },
    ]);
  onMonitorsChanged =
    (_cb: (m: MonitorInfo[]) => void): Unsubscribe =>
    () => {};

  setDockPosition = (_pos: DockPosition) => Promise.resolve();
  setAutoHide = (_on: boolean) => Promise.resolve();
  setBlurMode = (_mode: BlurMode) => Promise.resolve();
  setDockGeometry = (_g: DockGeometry) => Promise.resolve();
  setFocusable = (_on: boolean) => Promise.resolve();

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
