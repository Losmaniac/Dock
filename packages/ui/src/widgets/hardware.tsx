import { ChevronLeft, ChevronRight, Thermometer, Wifi } from "lucide-react";
import {
  formatRate,
  useDesktops,
  useDisks,
  useNetwork,
  useSystemStats,
  useTemperatures,
} from "../hooks/useInfoFeeds";
import { formatBytes } from "../lib/timefmt";
import { messageOf, useDock } from "../store/dockStore";
import type { FaceProps } from "./types";
import { Bar, Big, Btn, Note, Small, Stack } from "./ui";

const num = (n: number, d = 0) => n.toFixed(d).replace(".", ",");
const pct = (n: number) => `${Math.round(n)}%`;

export function StorageFace({ active, wide }: FaceProps) {
  const disks = useDisks(active);
  const shown = (disks ?? []).filter((d) => !d.removable && d.total > 0).slice(0, wide ? 2 : 1);
  if (!shown.length) return <Small>No disks</Small>;
  return (
    <span className="flex gap-3 px-1">
      {shown.map((d) => (
        <Stack key={d.mount}>
          <Big>{pct((100 * (d.total - d.available)) / d.total)}</Big>
          <Small>{d.mount.replace(/\\$/, "")}</Small>
        </Stack>
      ))}
    </span>
  );
}

export function StoragePanel() {
  const disks = useDisks(true);
  return (
    <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
      {(disks ?? [])
        .filter((d) => d.total > 0)
        .map((d) => {
          const used = d.total - d.available;
          return (
            <div key={d.mount}>
              <div className="flex justify-between">
                <span>
                  {d.mount} {d.name}
                </span>
                <span className="tabular-nums text-xs opacity-80">
                  {formatBytes(d.available)} free of {formatBytes(d.total)}
                </span>
              </div>
              <Bar
                pct={(100 * used) / d.total}
                color={used / d.total > 0.9 ? "#ef4444" : "var(--accent)"}
              />
            </div>
          );
        })}
    </div>
  );
}

export function NetworkFace({ active }: FaceProps) {
  const { latest } = useSystemStats(active);
  return (
    <Stack>
      <Wifi size={16} />
      <Small>↓ {latest ? formatRate(latest.netDownBytesPerSec) : "–"}</Small>
      <Small>↑ {latest ? formatRate(latest.netUpBytesPerSec) : "–"}</Small>
    </Stack>
  );
}

export function NetworkPanel() {
  const n = useNetwork(true);
  const { latest } = useSystemStats(true);
  return (
    <div className="space-y-2 text-sm">
      <div className="font-semibold">
        {n?.wifi ? `${n.wifi.ssid} · signal ${n.wifi.signal} %` : "Not on Wi-Fi"}
      </div>
      {latest && (
        <div className="tabular-nums opacity-80">
          ↓ {formatRate(latest.netDownBytesPerSec)} ↑ {formatRate(latest.netUpBytesPerSec)}
        </div>
      )}
      <ul className="max-h-24 overflow-y-auto text-xs opacity-80">
        {(n?.adapters ?? []).map((a) => (
          <li key={a.name}>
            {a.name}: {a.ips.join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TemperatureFace({ active }: FaceProps) {
  const t = useTemperatures(active);
  if (!t) return <Thermometer size={20} className="opacity-50" />;
  if (t.length === 0)
    return (
      <Stack>
        <Thermometer size={18} />
        <Small>no sensor</Small>
      </Stack>
    );
  const hottest = Math.max(...t.map((x) => x.celsius));
  return (
    <Stack>
      <Big>{Math.round(hottest)}°C</Big>
      <Small>max</Small>
    </Stack>
  );
}

export function TemperaturePanel() {
  const t = useTemperatures(true);
  if (!t || t.length === 0) {
    return (
      <p className="text-sm opacity-70">
        Windows does not expose temperature sensors to apps without a vendor driver, and none were
        found on this PC. Nothing is shown rather than a made-up value.
      </p>
    );
  }
  return (
    <ul className="max-h-48 overflow-y-auto text-sm">
      {t.map((x) => (
        <li key={x.label} className="flex justify-between">
          <span>{x.label}</span>
          <span className="tabular-nums">{num(x.celsius, 1)} °C</span>
        </li>
      ))}
    </ul>
  );
}

export function DesktopsFace({ active }: FaceProps) {
  const d = useDesktops(active);
  return (
    <Stack>
      <Big>{d ? `${d.current === null ? "?" : d.current + 1}/${d.count}` : "–"}</Big>
      <Small>desktop</Small>
    </Stack>
  );
}

export function DesktopsPanel() {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const d = useDesktops(true);
  const go = (dir: "left" | "right") =>
    platform.switchVirtualDesktop(dir).catch((e) => report(messageOf(e)));
  return (
    <div className="space-y-3">
      <div className="text-lg">
        Desktop {d?.current == null ? "?" : d.current + 1} of {d?.count ?? 1}
      </div>
      <div className="flex gap-2">
        <Btn onClick={() => go("left")} label="Previous desktop">
          <ChevronLeft size={16} />
        </Btn>
        <Btn onClick={() => go("right")} label="Next desktop">
          <ChevronRight size={16} />
        </Btn>
      </div>
      <Note>
        Switching sends the Windows shortcut Win+Ctrl+Left or Right. Creating or closing desktops is
        left to Windows.
      </Note>
    </div>
  );
}
