import { MotionConfig } from "framer-motion";
import { useEffect } from "react";
import type { PlatformAPI } from "@glass-dock/platform";
import { Dock } from "./components/Dock";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useDock } from "./store/dockStore";

export function App({
  platform,
  dockId = null,
}: {
  platform: PlatformAPI;
  dockId?: string | null;
}) {
  const attached = useDock((s) => s.platform === platform);
  useEffect(() => useDock.getState().init(platform, dockId), [platform, dockId]);
  return attached ? (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary platform={platform}>
        <Dock />
      </ErrorBoundary>
    </MotionConfig>
  ) : null;
}
