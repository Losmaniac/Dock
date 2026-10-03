import { MockAdapter } from "./mock-adapter";
import { TauriAdapter } from "./tauri-adapter";
import type { PlatformAPI } from "./platform-api";

export type { PlatformAPI } from "./platform-api";
export { MockAdapter } from "./mock-adapter";
export { TauriAdapter } from "./tauri-adapter";

/** Tauri 2 injects `__TAURI_INTERNALS__`; `__TAURI__` exists only with withGlobalTauri. */
export function createPlatform(): PlatformAPI {
  const isTauri =
    typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
  return isTauri ? new TauriAdapter() : new MockAdapter();
}
