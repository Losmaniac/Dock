import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useAudioState, useNowPlaying } from "../hooks/useInfoFeeds";
import { useNextEvent, useWeather } from "../hooks/useIntegrations";
import { messageOf, useDock } from "../store/dockStore";

export function Media() {
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

export function Volume() {
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

export function Calendar() {
  const { data, configured, error } = useNextEvent(true);
  if (!configured)
    return (
      <p className="opacity-60">
        Add a read-only ICS link in Settings to enable this widget. Recurring events are not
        expanded.
      </p>
    );
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="opacity-60">No upcoming events.</p>;
  return (
    <div>
      <div className="text-base font-semibold">{data.title}</div>
      <div className="opacity-70">
        {new Intl.DateTimeFormat(
          undefined,
          data.allDay ? { dateStyle: "full" } : { dateStyle: "full", timeStyle: "short" },
        ).format(data.start)}
      </div>
    </div>
  );
}

export function WeatherPanel() {
  const { data, configured, error } = useWeather(true);
  if (!configured)
    return (
      <p className="opacity-60">
        Enter a city and an OpenWeatherMap key in Settings. The request is only sent once both are
        set.
      </p>
    );
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="opacity-60">Loading…</p>;
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">
        {data.tempC.toFixed(1).replace(".", ",")} °C
      </div>
      <div className="opacity-70">
        {data.city}, {data.description}
      </div>
    </div>
  );
}
