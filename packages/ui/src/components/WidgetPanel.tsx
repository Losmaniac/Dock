import { X } from "lucide-react";
import { formatRate, useBattery, useSystemStats } from "../hooks/useInfoFeeds";
import type { WidgetKind } from "../lib/overlay";
import { Sparkline } from "./Sparkline";
import { Calendar, Media, Volume, WeatherPanel } from "./WidgetBodies";
import { WIDGET_LABEL } from "./WidgetFace";

export const WIDGET_SIZE = { w: 300, h: 250 };

const num = (n: number, d = 0) => n.toFixed(d).replace(".", ",");

export function WidgetPanel({ widget, close }: { widget: WidgetKind; close: () => void }) {
  return (
    <div className="panel p-4 text-sm" style={{ width: WIDGET_SIZE.w, height: WIDGET_SIZE.h }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{WIDGET_LABEL[widget]}</h2>
        <button aria-label="Close" onClick={close} className="rounded-lg p-1 hover:bg-white/15">
          <X size={16} />
        </button>
      </div>
      {widget === "system-stats" && <Stats />}
      {widget === "battery" && <Battery />}
      {widget === "now-playing" && <Media />}
      {widget === "clock" && <Clock />}
      {widget === "volume" && <Volume />}
      {widget === "calendar" && <Calendar />}
      {widget === "weather" && <WeatherPanel />}
    </div>
  );
}

function Stats() {
  const { latest, cpu, ram } = useSystemStats(true);
  if (!latest) return <p className="opacity-60">Sampling…</p>;
  return (
    <div className="space-y-2">
      <div>
        <div className="flex justify-between">
          <span>CPU</span>
          <span className="tabular-nums">{num(latest.cpuPercent)} %</span>
        </div>
        <Sparkline values={cpu} />
      </div>
      <div>
        <div className="flex justify-between">
          <span>RAM</span>
          <span className="tabular-nums">{num(latest.ramPercent)} %</span>
        </div>
        <Sparkline values={ram} color="#f59e0b" />
      </div>
      <div className="flex justify-between text-xs opacity-80">
        <span>Disk {num(latest.diskPercent)} %</span>
        <span>
          ↑ {formatRate(latest.netUpBytesPerSec)} ↓ {formatRate(latest.netDownBytesPerSec)}
        </span>
      </div>
    </div>
  );
}

function Battery() {
  const b = useBattery(true);
  return <p>{b ? `${b.percent} %${b.charging ? " (charging)" : ""}` : "No battery detected."}</p>;
}

function Clock() {
  const now = new Date();
  return (
    <p className="text-lg">
      {new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(now)}
    </p>
  );
}
