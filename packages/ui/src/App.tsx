import type { PlatformAPI } from "@glass-dock/platform";
import { Dock } from "./components/Dock";
import { PlatformContext } from "./platform-context";

export function App({ platform }: { platform: PlatformAPI }) {
  return (
    <PlatformContext.Provider value={platform}>
      <Dock />
    </PlatformContext.Provider>
  );
}
