export type Unsubscribe = () => void;

export type DockErrorCode =
  "not_implemented" | "not_supported" | "invalid_argument" | "access_denied" | "os_error";

/** Serialized form of the Rust `DockError`. */
export interface DockError {
  code: DockErrorCode;
  message: string;
}

export interface WindowInfo {
  /** HWND as a decimal string (u64 does not fit a JS number safely). */
  hwnd: string;
  title: string;
  processName: string;
  processPath: string;
  /** Set for Store apps hosted by ApplicationFrameHost; identifies the real app. */
  aumid?: string | null;
  focused: boolean;
  minimized: boolean;
  /** Elevated windows cannot be controlled by a non-elevated dock. */
  elevated: boolean;
  topmost: boolean;
}

export type SnapLayout =
  | "left-half"
  | "right-half"
  | "top-half"
  | "bottom-half"
  | "maximize"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "left-third"
  | "center-third"
  | "right-third";

export type LaunchItem =
  | { type: "app"; path: string; args?: string[] }
  | { type: "folder"; path: string }
  | { type: "file"; path: string }
  | { type: "url"; url: string }
  | { type: "uwp"; aumid: string };

export type IconSource = { path: string } | { aumid: string };

export interface SystemStats {
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  netUpBytesPerSec: number;
  netDownBytesPerSec: number;
}

export interface BatteryInfo {
  percent: number;
  charging: boolean;
}

export interface MediaInfo {
  title: string;
  artist: string;
  playing: boolean;
  /** Playback position at the time of the poll; 0 when the app does not report it. */
  positionMs: number;
  durationMs: number;
}

export interface PathInfo {
  kind: "app" | "folder" | "file";
  label: string;
  path: string;
  args: string[];
}

export interface FolderEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export interface MonitorInfo {
  /** Stable device name such as `\\.\DISPLAY1`. */
  id: string;
  primary: boolean;
  width: number;
  height: number;
  scale: number;
}

export interface AudioState {
  /** 0..1 master output volume. */
  volume: number;
  muted: boolean;
  /** null when there is no capture device. */
  micMuted: boolean | null;
}

/** Window position as fractions of the work area of the monitor it is on. */
export interface Placement {
  monitorId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  maximized: boolean;
}

/** Physical pixels relative to the dock window's client area. */
export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MediaAction = "play-pause" | "next" | "previous";

export type DockMode = "hidden" | "rest" | "active" | "fullscreen";

/** Sizes in CSS pixels, measured by the frontend. */
export interface DockGeometry {
  position: DockPosition;
  mode: DockMode;
  length: number;
  thickness: number;
  /** Gap to the screen edge; 0 when auto-hide is on. */
  margin: number;
  /** "primary" or a monitor id; unknown ids fall back to primary. */
  monitor: string;
  /** Logical px to reserve as an AppBar (0 = do not reserve). */
  reserve: number;
}

export type DockPosition = "bottom" | "top" | "left" | "right";
export type BlurMode = "mica" | "acrylic" | "blur" | "none";

export interface DiskInfo {
  mount: string;
  name: string;
  total: number;
  available: number;
  removable: boolean;
}

export interface TemperatureReading {
  label: string;
  celsius: number;
}

export interface NetworkInfo {
  adapters: { name: string; ips: string[] }[];
  wifi: { ssid: string; signal: number } | null;
}

export interface VirtualDesktops {
  count: number;
  /** null when Windows does not expose the current desktop. */
  current: number | null;
}
