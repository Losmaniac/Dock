import { useEffect } from "react";
import type { PlatformAPI } from "@glass-dock/platform";
import { Dock } from "./components/Dock";
import { useDock } from "./store/dockStore";

export function App({ platform }: { platform: PlatformAPI }) {
  const attached = useDock((s) => s.platform === platform);
  useEffect(() => useDock.getState().init(platform), [platform]);
  return attached ? <Dock /> : null;
}
