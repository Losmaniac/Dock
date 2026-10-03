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

/** The only way UI code reaches the OS. UI never imports `@tauri-apps/*`. */
export interface PlatformAPI {
  // Windows
  listWindows(): Promise<WindowInfo[]>;
  focusWindow(hwnd: string): Promise<void>;
  minimizeWindow(hwnd: string): Promise<void>;
  closeWindow(hwnd: string): Promise<void>;
  snapWindow(hwnd: string, layout: SnapLayout): Promise<void>;
  moveWindowToMonitor(hwnd: string, monitorId: string): Promise<void>;
  setAlwaysOnTop(hwnd: string, on: boolean): Promise<void>;
  setWindowOpacity(hwnd: string, value: number): Promise<void>; // 0..1
  onWindowsChanged(cb: (w: WindowInfo[]) => void): Unsubscribe;

  // Launcher
  launch(item: LaunchItem): Promise<void>;
  getIcon(source: IconSource): Promise<string>; // data URL (PNG)
  registerHotkey(accelerator: string, actionId: string): Promise<void>;

  // Info
  getSystemStats(): Promise<SystemStats>;
  getBattery(): Promise<BatteryInfo | null>;
  getNowPlaying(): Promise<MediaInfo | null>;
  onNowPlaying(cb: (m: MediaInfo | null) => void): Unsubscribe;

  // Dock shell
  setDockPosition(pos: DockPosition): Promise<void>;
  setAutoHide(on: boolean): Promise<void>;
  setBlurMode(mode: BlurMode): Promise<void>;

  // Config
  loadConfig(): Promise<DockConfig>;
  saveConfig(cfg: DockConfig): Promise<void>;
}
