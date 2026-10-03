import { BatteryCharging, BatteryFull, Music, Pause, Volume2, VolumeX } from "lucide-react";
import { useAudio, useBattery, useNowPlaying, useSystemStats } from "../hooks/useInfoFeeds";
import type { WidgetKind } from "../lib/overlay";
import { ClockWidget } from "./ClockWidget";

export const WIDGET_LABEL: Record<WidgetKind, string> = {
  clock: "Clock",
  "system-stats": "System load",
  battery: "Battery",
  "now-playing": "Now playing",
  volume: "Volume",
};

const pct = (n: number) => `${Math.round(n)}%`;

/** Face drawn inside the dock tile. Hooks only run while `active` (visible), else cost nothing. */
export function WidgetFace({ widget, active }: { widget: WidgetKind; active: boolean }) {
  switch (widget) {
    case "clock":
      return <ClockWidget />;
    case "system-stats":
      return <StatsFace active={active} />;
    case "battery":
      return <BatteryFace active={active} />;
    case "now-playing":
      return <MediaFace active={active} />;
    case "volume":
      return <VolumeFace active={active} />;
  }
}

function StatsFace({ active }: { active: boolean }) {
  const { latest } = useSystemStats(active);
  return (
    <span className="flex flex-col items-center text-[11px] leading-tight tabular-nums">
      <span className="text-sm font-semibold">{latest ? pct(latest.cpuPercent) : "–"}</span>
      <span className="opacity-70">CPU</span>
      <span className="opacity-70">{latest ? pct(latest.ramPercent) : "–"} RAM</span>
    </span>
  );
}

function BatteryFace({ active }: { active: boolean }) {
  const b = useBattery(active);
  if (!b) return <span className="text-[11px] opacity-70">No battery</span>;
  const Icon = b.charging ? BatteryCharging : BatteryFull;
  return (
    <span className="flex flex-col items-center text-sm font-semibold tabular-nums">
      <Icon size={18} />
      {pct(b.percent)}
    </span>
  );
}

function MediaFace({ active }: { active: boolean }) {
  const m = useNowPlaying(active);
  return m?.playing ? <Music size={22} /> : <Pause size={22} className={m ? "" : "opacity-40"} />;
}

function VolumeFace({ active }: { active: boolean }) {
  const a = useAudio(active);
  if (!a) return <Volume2 size={22} className="opacity-40" />;
  return (
    <span className="flex flex-col items-center text-sm font-semibold tabular-nums">
      {a.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      {Math.round(a.volume * 100)}
    </span>
  );
}
