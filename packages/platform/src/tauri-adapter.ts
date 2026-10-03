import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type {
  AudioState,
  BlurMode,
  DockConfig,
  DockGeometry,
  DockPosition,
  FolderEntry,
  IconSource,
  MediaAction,
  MediaInfo,
  MonitorInfo,
  SnapLayout,
  SystemStats,
  BatteryInfo,
  LaunchItem,
  PathInfo,
  PixelRect,
  Placement,
  Unsubscribe,
  WindowInfo,
} from "@glass-dock/shared";
import { loadConfigFromRaw } from "./config-io";
import type { PlatformAPI } from "./platform-api";

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
 * Every method is backed by a Rust command or event; there is no mock data on this path.
 */
export class TauriAdapter implements PlatformAPI {
  // Windows
  listWindows = () => invoke<WindowInfo[]>("list_windows");
  focusWindow = (hwnd: string) => invoke<void>("focus_window", { hwnd });
  minimizeWindow = (hwnd: string) => invoke<void>("minimize_window", { hwnd });
  closeWindow = (hwnd: string) => invoke<void>("close_window", { hwnd });
  onWindowsChanged = (cb: (w: WindowInfo[]) => void) =>
    subscribe<WindowInfo[]>("windows-changed", cb);
  snapWindow = (hwnd: string, layout: SnapLayout) => invoke<void>("snap_window", { hwnd, layout });
  moveWindowToMonitor = (hwnd: string, monitorId: string) =>
    invoke<void>("move_window_to_monitor", { hwnd, monitorId });
  setAlwaysOnTop = (hwnd: string, on: boolean) => invoke<void>("set_always_on_top", { hwnd, on });
  setWindowOpacity = (hwnd: string, value: number) =>
    invoke<void>("set_window_opacity", { hwnd, value });

  // Launcher
  launch = (item: LaunchItem) => invoke<void>("launch", { item });
  getIcon = (source: IconSource) => invoke<string>("get_icon", { source });
  describePath = (path: string) => invoke<PathInfo>("describe_path", { path });
  listFolder = (path: string): Promise<FolderEntry[]> => invoke("list_folder", { path });
  registerHotkey = (accelerator: string, actionId: string) =>
    invoke<void>("register_hotkey", { accelerator, actionId });
  onHotkey = (cb: (actionId: string) => void) => subscribe<string>("hotkey", cb);
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

  // Info
  getSystemStats = () => invoke<SystemStats>("get_system_stats");
  getBattery = () => invoke<BatteryInfo | null>("get_battery");
  getNowPlaying = () => invoke<MediaInfo | null>("get_now_playing");
  mediaControl = (action: MediaAction) => invoke<void>("media_control", { action });
  getMonitors = () => invoke<MonitorInfo[]>("get_monitors");
  onMonitorsChanged = (cb: (m: MonitorInfo[]) => void) =>
    subscribe<MonitorInfo[]>("monitors-changed", cb);
  /** SMTC has no cheap push channel here, so poll only while someone is subscribed (a visible widget). */
  onNowPlaying(cb: (m: MediaInfo | null) => void): Unsubscribe {
    let last = "";
    const tick = () =>
      void this.getNowPlaying()
        .then((m) => {
          const key = JSON.stringify(m);
          if (key !== last) {
            last = key;
            cb(m);
          }
        })
        .catch(() => cb(null));
    tick();
    const t = setInterval(tick, 1500);
    return () => clearInterval(t);
  }

  // Audio
  getAudio = () => invoke<AudioState>("get_audio");
  setVolume = (volume: number) => invoke<void>("set_volume", { volume });
  setMuted = (target: "output" | "input", muted: boolean) =>
    invoke<void>("set_muted", { input: target === "input", muted });

  // Window layout
  capturePlacement = (hwnd: string) => invoke<Placement | null>("capture_placement", { hwnd });
  placeWindow = (hwnd: string, placement: Placement) =>
    invoke<void>("place_window", { hwnd, placement });

  // Previews
  showThumbnail = (hwnd: string, rect: PixelRect) => invoke<void>("show_thumbnail", { hwnd, rect });
  hideThumbnails = () => invoke<void>("hide_thumbnails");

  // System
  fetchText = (url: string) => invoke<string>("fetch_text", { url });
  getAutostart = () => invoke<boolean>("get_autostart");
  setAutostart = (on: boolean) => invoke<void>("set_autostart", { on });
  exportConfig = (json: string) => invoke<string>("export_config", { json });

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
