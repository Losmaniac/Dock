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
  /** Rejects with a readable message when the combination is taken. Empty accelerator unregisters. */
  registerHotkey(accelerator: string, actionId: string): Promise<void>;
  onHotkey(cb: (actionId: string) => void): Unsubscribe;
  /** Classify a dropped path and resolve .lnk shortcuts. */
  describePath(path: string): Promise<PathInfo>;
  /** Launcher catalog: Start Menu + Store apps, recent files, and a bounded file-name index. */
  getStartApps(): Promise<StartApp[]>;
  getRecentFiles(): Promise<RecentFile[]>;
  searchDocuments(query: string): Promise<DocHit[]>;
  listFolder(path: string): Promise<FolderEntry[]>;
  /** Files dropped on the dock window; `point` is in CSS pixels. */
  onFilesDropped(cb: (paths: string[], point: { x: number; y: number }) => void): Unsubscribe;

  // Info
  getSystemStats(): Promise<SystemStats>;
  getBattery(): Promise<BatteryInfo | null>;
  getNowPlaying(): Promise<MediaInfo | null>;
  onNowPlaying(cb: (m: MediaInfo | null) => void): Unsubscribe;
  mediaControl(action: MediaAction): Promise<void>;
  getMonitors(): Promise<MonitorInfo[]>;
  onMonitorsChanged(cb: (m: MonitorInfo[]) => void): Unsubscribe;

  getDisks(): Promise<DiskInfo[]>;
  getUptime(): Promise<number>; // seconds
  getTemperatures(): Promise<TemperatureReading[]>; // often empty on Windows
  getNetwork(): Promise<NetworkInfo>;
  getVirtualDesktops(): Promise<VirtualDesktops>;
  /** BCP-47 tag of the keyboard layout used by the foreground window, for example "en-US". */
  getKeyboardLanguage(): Promise<string>;
  switchVirtualDesktop(direction: "left" | "right"): Promise<void>;
  /** Album art of the current media session as a data URL, or null. */
  getMediaCover(): Promise<string | null>;

  /** Current desktop wallpaper as a data URL, or null (solid colour, slideshow, unreadable). */
  getWallpaper(): Promise<string | null>;

  // Audio
  getAudio(): Promise<AudioState>;
  setVolume(volume: number): Promise<void>;
  setMuted(target: "output" | "input", muted: boolean): Promise<void>;

  // Window layout (workspaces)
  capturePlacement(hwnd: string): Promise<Placement | null>;
  placeWindow(hwnd: string, placement: Placement): Promise<void>;

  // Live previews (DWM thumbnails composited over the dock window)
  showThumbnail(hwnd: string, rect: PixelRect): Promise<void>;
  hideThumbnails(): Promise<void>;

  // System
  /** Hide or show the native taskbar. Always restored on exit and after a crash. */
  setTaskbarHidden(hidden: boolean): Promise<void>;
  /** The only network call: https, public hosts only. Used by opt-in widgets. */
  fetchText(url: string): Promise<string>;
  getAutostart(): Promise<boolean>;
  setAutostart(on: boolean): Promise<void>;
  /** Persist an exported config; resolves to a human-readable location. */
  exportConfig(json: string): Promise<string>;

  // Dock shell
  setDockPosition(pos: DockPosition): Promise<void>;
  setAutoHide(on: boolean): Promise<void>;
  setBlurMode(mode: BlurMode): Promise<void>;
  /** Resize and place the dock window. UI computes sizes; Rust owns monitor math. */
  setDockGeometry(geometry: DockGeometry): Promise<void>;
  /** The dock must not take focus, except while a text field needs the keyboard. */
  setFocusable(on: boolean): Promise<void>;

  // Config
  /** Another dock window saved the config; adopt it. Fires for all windows, including the saver. */
  onConfigChanged(cb: (cfg: DockConfig) => void): Unsubscribe;
  /** Which dock this window shows: from its window label (or the URL in the web demo); null = main. */
  windowDockId(): string | null;
  /** Make the set of extra dock windows (everything after the first dock) match `dockIds`. */
  syncDockWindows(dockIds: string[]): Promise<void>;
  loadConfig(): Promise<DockConfig>;
  saveConfig(cfg: DockConfig): Promise<void>;
}
