import { useEffect, useState } from "react";
import type { BatteryInfo, MediaInfo, SystemStats } from "@glass-dock/shared";
import type { PlatformAPI } from "@glass-dock/platform";
import { useDock } from "../store/dockStore";

/** One shared 1 000 ms sampler regardless of how many widgets show it; zero cost with no subscribers. */
const HISTORY = 60;
type Snapshot = { latest: SystemStats | null; cpu: number[]; ram: number[] };
const empty: Snapshot = { latest: null, cpu: [], ram: [] };
let snap: Snapshot = empty;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<(s: Snapshot) => void>();

function start(platform: PlatformAPI) {
  const tick = () =>
    void platform
      .getSystemStats()
      .then((latest) => {
        snap = {
          latest,
          cpu: [...snap.cpu, latest.cpuPercent].slice(-HISTORY),
          ram: [...snap.ram, latest.ramPercent].slice(-HISTORY),
        };
        listeners.forEach((l) => l(snap));
      })
      .catch((e) => useDock.getState().report(e));
  tick();
  timer = setInterval(tick, 1000);
}

export function useSystemStats(active: boolean): Snapshot {
  const platform = useDock((s) => s.platform)!;
  const [s, setS] = useState(snap);
  useEffect(() => {
    if (!active) return;
    listeners.add(setS);
    if (listeners.size === 1) start(platform);
    return () => {
      listeners.delete(setS);
      if (listeners.size === 0) {
        clearInterval(timer);
        timer = undefined;
        snap = empty;
      }
    };
  }, [active, platform]);
  return s;
}

export function useBattery(active: boolean): BatteryInfo | null {
  const platform = useDock((s) => s.platform)!;
  const [b, setB] = useState<BatteryInfo | null>(null);
  useEffect(() => {
    if (!active) return;
    const tick = () =>
      void platform
        .getBattery()
        .then(setB)
        .catch(() => setB(null));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [active, platform]);
  return b;
}

export function useNowPlaying(active: boolean): MediaInfo | null {
  const platform = useDock((s) => s.platform)!;
  const [m, setM] = useState<MediaInfo | null>(null);
  useEffect(() => (active ? platform.onNowPlaying(setM) : undefined), [active, platform]);
  return m;
}

export const formatRate = (bytes: number): string => {
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let v = bytes;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0).replace(".", ",")} ${units[i]}`;
};
