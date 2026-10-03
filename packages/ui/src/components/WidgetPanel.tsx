import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import {
  formatRate,
  useAudioState,
  useBattery,
  useNowPlaying,
  useSystemStats,
} from "../hooks/useInfoFeeds";
import type { WidgetKind } from "../lib/overlay";
import { messageOf, useDock } from "../store/dockStore";
import { Sparkline } from "./Sparkline";
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

function Media() {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const m = useNowPlaying(true);
  const send = (a: "play-pause" | "next" | "previous") =>
    platform.mediaControl(a).catch((e) => report(messageOf(e)));
  if (!m) return <p className="opacity-60">Nothing is playing.</p>;
  return (
    <div className="space-y-3">
      <div>
        <div className="truncate text-base font-semibold">{m.title || "Unknown title"}</div>
        <div className="truncate opacity-70">{m.artist}</div>
      </div>
      <div className="flex justify-center gap-4">
        <button
          aria-label="Previous"
          onClick={() => send("previous")}
          className="rounded-full p-2 hover:bg-white/15"
        >
          <SkipBack size={20} />
        </button>
        <button
          aria-label={m.playing ? "Pause" : "Play"}
          onClick={() => send("play-pause")}
          className="rounded-full bg-accent p-2 text-white"
        >
          {m.playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          aria-label="Next"
          onClick={() => send("next")}
          className="rounded-full p-2 hover:bg-white/15"
        >
          <SkipForward size={20} />
        </button>
      </div>
    </div>
  );
}

function Volume() {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const [a, setA] = useAudioState(true);
  if (!a) return <p className="opacity-60">No audio device.</p>;
  const fail = (e: unknown) => report(messageOf(e));
  const mic = (m: boolean) => {
    setA({ ...a, micMuted: m });
    platform.setMuted("input", m).catch(fail);
  };
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3">
        <span className="w-14">Output</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(a.volume * 100)}
          aria-label="Volume"
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            setA({ ...a, volume: v });
            platform.setVolume(v).catch(fail);
          }}
          className="flex-1 accent-[var(--accent)]"
        />
        <span className="w-10 text-right tabular-nums">{Math.round(a.volume * 100)}</span>
      </label>
      <label className="flex items-center justify-between">
        <span>Mute output</span>
        <input
          type="checkbox"
          checked={a.muted}
          onChange={(e) => {
            setA({ ...a, muted: e.target.checked });
            platform.setMuted("output", e.target.checked).catch(fail);
          }}
        />
      </label>
      {a.micMuted !== null && (
        <label className="flex items-center justify-between">
          <span>Mute microphone</span>
          <input type="checkbox" checked={a.micMuted} onChange={(e) => mic(e.target.checked)} />
        </label>
      )}
    </div>
  );
}
