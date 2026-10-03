import { BatteryCharging, BatteryFull } from "lucide-react";
import { formatRate, useBattery, useSystemStats, useUptime } from "../hooks/useInfoFeeds";
import { formatUptime } from "../lib/timefmt";
import { Sparkline } from "../components/Sparkline";
import type { FaceProps } from "./types";
import { Bar, Big, Note, Small, Stack } from "./ui";

const pct = (n: number) => `${Math.round(n)}%`;
const num = (n: number, d = 0) => n.toFixed(d).replace(".", ",");

export function StatsFace({ active, wide }: FaceProps) {
  const { latest, cpu } = useSystemStats(active);
  return (
    <span className="flex items-center gap-2 px-1">
      <Stack>
        <Big>{latest ? pct(latest.cpuPercent) : "–"}</Big>
        <Small>CPU</Small>
        <Small>{latest ? pct(latest.ramPercent) : "–"} RAM</Small>
      </Stack>
      {wide && <Sparkline values={cpu} w={44} h={28} />}
    </span>
  );
}

export function StatsPanel() {
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

export function BatteryFace({ active }: FaceProps) {
  const b = useBattery(active);
  if (!b) return <Small>No battery</Small>;
  const Icon = b.charging ? BatteryCharging : BatteryFull;
  return (
    <Stack>
      <Icon size={18} />
      <Big>{pct(b.percent)}</Big>
    </Stack>
  );
}

export function BatteryPanel() {
  const b = useBattery(true);
  if (!b) return <p className="opacity-60">No battery detected.</p>;
  return (
    <div className="space-y-2">
      <div className="text-2xl font-semibold">{b.percent} %</div>
      <Bar pct={b.percent} color={b.percent < 20 ? "#ef4444" : "#22c55e"} />
      <Note>{b.charging ? "Charging" : "On battery"}</Note>
    </div>
  );
}

export function UptimeFace({ active }: FaceProps) {
  const s = useUptime(active);
  return (
    <Stack>
      <Big>{s === null ? "–" : formatUptime(s)}</Big>
      <Small>uptime</Small>
    </Stack>
  );
}

export function UptimePanel() {
  const s = useUptime(true);
  return (
    <div>
      <div className="text-2xl font-semibold">{s === null ? "–" : formatUptime(s)}</div>
      <Note>
        Time since Windows last started. Fast Startup can make this longer than your last shutdown.
      </Note>
    </div>
  );
}
