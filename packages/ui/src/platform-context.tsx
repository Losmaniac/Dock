import { createContext, useContext } from "react";
import type { PlatformAPI } from "@glass-dock/platform";

export const PlatformContext = createContext<PlatformAPI | null>(null);

export function usePlatform(): PlatformAPI {
  const p = useContext(PlatformContext);
  if (!p) throw new Error("usePlatform must be used inside <App platform={...}>");
  return p;
}
