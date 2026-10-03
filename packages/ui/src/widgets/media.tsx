import { Music, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MediaInfo } from "@glass-dock/shared";
import { useAudio, useAudioState, useNowPlaying } from "../hooks/useInfoFeeds";
import { useNow } from "../hooks/usePolled";
import { messageOf, useDock } from "../store/dockStore";
import { useOption } from "./hooks";
import type { FaceProps, PanelProps } from "./types";
import { Big, Btn, Small, Stack } from "./ui";
import { Turntable } from "./Turntable";

export function MediaFace({ active, wide }: FaceProps) {
  const m = useNowPlaying(active);
  if (!m) return <Pause size={22} className="opacity-40" />;
  if (!wide) return m.playing ? <Music size={22} /> : <Pause size={22} />;
  return (
    <Stack>
      <Small>{m.playing ? "Playing" : "Paused"}</Small>
      <span className="max-w-full truncate text-[11px] font-medium">{m.title}</span>
      <Small>{m.artist}</Small>
    </Stack>
  );
}

function Controls({ playing }: { playing: boolean }) {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const send = (a: "play-pause" | "next" | "previous") =>
    platform.mediaControl(a).catch((e) => report(messageOf(e)));
  return (
    <div className="flex justify-center gap-4">
      <button
        aria-label="Previous"
        onClick={() => send("previous")}
        className="rounded-full p-2 hover:bg-white/15"
      >
        <SkipBack size={20} />
      </button>
      <button
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => send("play-pause")}
        className="rounded-full bg-accent p-2 text-white"
      >
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <button
        aria-label="Next"
        onClick={() => send("next")}
        className="rounded-full p-2 hover:bg-white/15"
      >
        <SkipForward size={20} />
      </button>
    </div>
  );
}

export function MediaPanel() {
  const m = useNowPlaying(true);
  if (!m) return <p className="opacity-60">Nothing is playing.</p>;
  return (
    <div className="space-y-3">
      <div>
        <div className="truncate text-base font-semibold">{m.title || "Unknown title"}</div>
        <div className="truncate opacity-70">{m.artist}</div>
      </div>
      <Controls playing={m.playing} />
    </div>
  );
}

/** Position estimate between 1,5 s polls: last reported position plus elapsed time while playing. */
function useProgress(m: MediaInfo | null, active: boolean): number {
  const stamp = useRef({ at: Date.now(), pos: 0 });
  useEffect(() => {
    stamp.current = { at: Date.now(), pos: m?.positionMs ?? 0 };
  }, [m?.positionMs, m?.title]);
  const now = useNow(active && !!m?.playing, 500);
  if (!m || m.durationMs <= 0) return 0;
  const pos = stamp.current.pos + (m.playing ? Math.max(0, now - stamp.current.at) : 0);
  return Math.min(1, pos / m.durationMs);
}

/** Album art, fetched once per track and only while the turntable is visible. */
function useCover(m: MediaInfo | null, active: boolean): string | null {
  const platform = useDock((s) => s.platform)!;
  const [cover, setCover] = useState<{ key: string; url: string | null } | null>(null);
  const key = m ? `${m.title}|${m.artist}` : "";
  useEffect(() => {
    if (!active || !key) return;
    let alive = true;
    // Art can arrive a moment after the track change, so retry once.
    const load = () =>
      platform
        .getMediaCover()
        .then((url) => alive && setCover({ key, url }))
        .catch(() => {});
    void load();
    const t = setTimeout(() => void load(), 1500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [platform, active, key]);
  return cover?.key === key ? cover.url : null;
}

export function TurntableFace({ item, active, wide }: FaceProps) {
  const m = useNowPlaying(active);
  const cover = useCover(m, active);
  const [finish] = useOption(item, "finish", "black");
  return (
    <Turntable
      size={wide ? 52 : 46}
      finish={finish}
      cover={cover}
      playing={!!m?.playing}
      progress={useProgress(m, active)}
      compact
    />
  );
}

const FINISHES = ["silver", "black", "walnut", "retro"] as const;

export function TurntablePanel({ item }: PanelProps) {
  const m = useNowPlaying(true);
  const cover = useCover(m, true);
  const [finish, setFinish] = useOption(item, "finish", "black");
  return (
    <div className="flex flex-col items-center gap-2">
      <Turntable
        size={170}
        finish={finish}
        cover={cover}
        playing={!!m?.playing}
        progress={useProgress(m, true)}
      />
      <div className="max-w-full text-center">
        <div className="truncate font-semibold">{m?.title ?? "Nothing playing"}</div>
        <div className="truncate text-xs opacity-70">{m?.artist}</div>
      </div>
      <Controls playing={!!m?.playing} />
      <div className="flex gap-1">
        {FINISHES.map((f) => (
          <Btn key={f} primary={finish === f} onClick={() => setFinish(f)}>
            {f}
          </Btn>
        ))}
      </div>
    </div>
  );
}

export function VolumeFace({ active }: FaceProps) {
  const a = useAudio(active);
  if (!a) return <Volume2 size={22} className="opacity-40" />;
  return (
    <Stack>
      {a.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      <Big>{Math.round(a.volume * 100)}</Big>
    </Stack>
  );
}

export function VolumePanel() {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const [a, setA] = useAudioState(true);
  if (!a) return <p className="opacity-60">No audio device.</p>;
  const fail = (e: unknown) => report(messageOf(e));
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
          className="flex-1 accent-[var(--accent)]"
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            setA({ ...a, volume: v });
            platform.setVolume(v).catch(fail);
          }}
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
          <input
            type="checkbox"
            checked={a.micMuted}
            onChange={(e) => {
              setA({ ...a, micMuted: e.target.checked });
              platform.setMuted("input", e.target.checked).catch(fail);
            }}
          />
        </label>
      )}
    </div>
  );
}
