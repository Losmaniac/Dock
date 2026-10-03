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
  focused: boolean;
  minimized: boolean;
  /** Elevated windows cannot be controlled by a non-elevated dock. */
  elevated: boolean;
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
  | "bottom-right";

export type LaunchItem =
  | { type: "app"; path: string; args?: string[] }
  | { type: "folder"; path: string }
  | { type: "file"; path: string }
  | { type: "url"; url: string };

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

export type DockPosition = "bottom" | "top" | "left" | "right";
export type BlurMode = "mica" | "acrylic" | "blur" | "none";
