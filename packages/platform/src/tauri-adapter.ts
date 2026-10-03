import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type {
  BlurMode,
  DockConfig,
  DockError,
  DockGeometry,
  DockPosition,
  FolderEntry,
  IconSource,
  LaunchItem,
  PathInfo,
  Unsubscribe,
  WindowInfo,
} from "@glass-dock/shared";
import { loadConfigFromRaw } from "./config-io";
import { MockAdapter } from "./mock-adapter";
import type { PlatformAPI } from "./platform-api";

function notImplemented(what: string, phase: number): never {
  const err: DockError = { code: "not_implemented", message: `${what} arrives in Phase ${phase}` };
  throw err;
}

const later = (what: string, phase: number) => () => Promise.reject(notImplemented(what, phase));

/** Subscribe to a Tauri event; returns a synchronous unsubscribe even though listen() is async. */
function subscribe<T>(event: string, cb: (payload: T) => void): Unsubscribe {
  let off: (() => void) | undefined;
  let cancelled = false;
  void listen<T>(event, (e) => cb(e.payload)).then((fn) => {
    if (cancelled) fn();
    else off = fn;
  });
  return () => {
    cancelled = true;
    off?.();
  };
}

/**
 * Phase 1 wires windows, launcher, icons, config and window geometry to Rust. Methods that
 * belong to later phases reject with a typed `not_implemented` error naming their phase.
 * The only mock use left is the labeled data for the info widgets until Phase 2.
 */
export class TauriAdapter implements PlatformAPI {
  private readonly info = new MockAdapter();

  // Windows
  listWindows = () => invoke<WindowInfo[]>("list_windows");
  focusWindow = (hwnd: string) => invoke<void>("focus_window", { hwnd });
  minimizeWindow = (hwnd: string) => invoke<void>("minimize_window", { hwnd });
  closeWindow = (hwnd: string) => invoke<void>("close_window", { hwnd });
  onWindowsChanged = (cb: (w: WindowInfo[]) => void) =>
    subscribe<WindowInfo[]>("windows-changed", cb);
  snapWindow = later("snapWindow", 2);
  moveWindowToMonitor = later("moveWindowToMonitor", 2);
  setAlwaysOnTop = later("setAlwaysOnTop", 2);
  setWindowOpacity = later("setWindowOpacity", 2);

  // Launcher
  launch = (item: LaunchItem) => invoke<void>("launch", { item });
  getIcon = (source: IconSource) => invoke<string>("get_icon", { source });
  describePath = (path: string) => invoke<PathInfo>("describe_path", { path });
  listFolder = (path: string): Promise<FolderEntry[]> => invoke("list_folder", { path });
  registerHotkey = later("registerHotkey", 2);
  onFilesDropped(cb: (paths: string[], point: { x: number; y: number }) => void): Unsubscribe {
    let off: (() => void) | undefined;
    let cancelled = false;
    void getCurrentWebview()
      .onDragDropEvent((e) => {
        if (e.payload.type !== "drop") return;
        const r = window.devicePixelRatio || 1;
        cb(e.payload.paths, { x: e.payload.position.x / r, y: e.payload.position.y / r });
      })
      .then((fn) => (cancelled ? fn() : (off = fn)));
    return () => {
      cancelled = true;
      off?.();
    };
  }

  // Info (Phase 2: real data). Labeled mock until then.
  getSystemStats = () => this.info.getSystemStats();
  getBattery = () => this.info.getBattery();
  getNowPlaying = () => this.info.getNowPlaying();
  onNowPlaying = (cb: Parameters<PlatformAPI["onNowPlaying"]>[0]) => this.info.onNowPlaying(cb);

  // Dock shell
  setBlurMode = (mode: BlurMode) => invoke<void>("set_blur_mode", { mode });
  setDockGeometry = (geometry: DockGeometry) => invoke<void>("set_dock_geometry", { geometry });
  setFocusable = (focusable: boolean) => invoke<void>("set_dock_focusable", { focusable });
  setDockPosition = (_pos: DockPosition) => Promise.resolve(); // driven by setDockGeometry
  setAutoHide = (_on: boolean) => Promise.resolve(); // driven by setDockGeometry

  // Config
  loadConfig = async (): Promise<DockConfig> =>
    loadConfigFromRaw(await invoke<string | null>("load_config"), () =>
      invoke("backup_corrupt_config"),
    );
  saveConfig = (cfg: DockConfig) =>
    invoke<void>("save_config", { json: JSON.stringify(cfg, null, 2) });
}
