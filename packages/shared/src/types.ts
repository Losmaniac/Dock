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

export type MediaAction = "play-pause" | "next" | "previous";

export type DockMode = "hidden" | "rest" | "active";

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
