import { invoke } from "@tauri-apps/api/core";
import type { DockConfig, BlurMode, DockError, Unsubscribe } from "@glass-dock/shared";
import { defaultConfig } from "@glass-dock/shared";
import { MockAdapter } from "./mock-adapter";
import type { PlatformAPI } from "./platform-api";

function notImplemented(what: string, phase: number): never {
  const err: DockError = { code: "not_implemented", message: `${what} arrives in Phase ${phase}` };
  throw err;
}

const later = (what: string, phase: number) => () => Promise.reject(notImplemented(what, phase));

/**
 * Phase 0: only `setBlurMode` is wired to Rust. Everything else rejects with a typed
 * `not_implemented` error so nothing silently pretends to work. Real window/icon data is
 * Phase 1, so the shell reuses the labeled mock data for rendering until then.
 */
export class TauriAdapter implements PlatformAPI {
  private readonly fallback = new MockAdapter();

  // Phase 1+ (native). Rendering data is delegated to the mock until the Rust side exists.
  listWindows = () => this.fallback.listWindows();
  onWindowsChanged = (cb: Parameters<PlatformAPI["onWindowsChanged"]>[0]): Unsubscribe =>
    this.fallback.onWindowsChanged(cb);
  getIcon = (s: Parameters<PlatformAPI["getIcon"]>[0]) => this.fallback.getIcon(s);
  loadConfig = (): Promise<DockConfig> => this.fallback.loadConfig().catch(() => defaultConfig());
  saveConfig = (c: DockConfig) => this.fallback.saveConfig(c);
  focusWindow = later("focusWindow", 1);
  minimizeWindow = later("minimizeWindow", 1);
  closeWindow = later("closeWindow", 1);
  launch = later("launch", 1);
  setDockPosition = later("setDockPosition", 1);
  setAutoHide = later("setAutoHide", 1);

  // Phase 2+
  snapWindow = later("snapWindow", 2);
  moveWindowToMonitor = later("moveWindowToMonitor", 2);
  setAlwaysOnTop = later("setAlwaysOnTop", 2);
  setWindowOpacity = later("setWindowOpacity", 2);
  registerHotkey = later("registerHotkey", 2);
  getSystemStats = later("getSystemStats", 2);
  getBattery = later("getBattery", 2);
  getNowPlaying = later("getNowPlaying", 2);
  onNowPlaying = (cb: Parameters<PlatformAPI["onNowPlaying"]>[0]): Unsubscribe => {
    cb(null);
    return () => {};
  };

  // Implemented in Phase 0
  setBlurMode(mode: BlurMode): Promise<void> {
    return invoke("set_blur_mode", { mode });
  }
}
