import { useEffect } from "react";
import { useDock } from "../store/dockStore";
import { useNow } from "../hooks/usePolled";
import { cityOf, countdownLabel, daysUntil, isValidTimeZone, timeIn } from "../lib/timefmt";
import * as sw from "../lib/stopwatch";
import * as pomo from "../lib/pomodoro";
import { parseJson, useJsonOption, useOption } from "./hooks";
import type { FaceProps, PanelProps } from "./types";
import { Big, Btn, Note, Small, Stack } from "./ui";

const parseSw = (raw?: string) => parseJson(raw, sw.initialStopwatch());
export function StopwatchFace({ item, active }: FaceProps) {
  const [s] = useJsonOption(item, "state", parseSw);
  const now = useNow(active && s.running, 100);
  return (
    <Stack>
      <Big>{sw.formatElapsed(sw.elapsed(s, now), false)}</Big>
      <Small>{s.running ? "running" : "stopwatch"}</Small>
    </Stack>
  );
}

export function StopwatchPanel({ item }: PanelProps) {
  const [s, setS] = useJsonOption(item, "state", parseSw);
  const now = useNow(s.running, 50);
  return (
    <div className="space-y-3">
      <div className="text-3xl font-semibold tabular-nums">
        {sw.formatElapsed(sw.elapsed(s, now))}
      </div>
      <div className="flex gap-2">
        <Btn primary onClick={() => setS(sw.toggle(s, Date.now()))}>
          {s.running ? "Stop" : "Start"}
        </Btn>
        <Btn onClick={() => setS(sw.lap(s, Date.now()))}>Lap</Btn>
        <Btn onClick={() => setS(sw.reset())}>Reset</Btn>
      </div>
      <ol className="max-h-24 overflow-y-auto text-xs tabular-nums opacity-80">
        {[...s.laps].reverse().map((l, i) => (
          <li key={i}>
            Lap {s.laps.length - i}: {sw.formatElapsed(l)}
          </li>
        ))}
      </ol>
    </div>
  );
}

const parsePomo = (raw?: string) => parseJson(raw, pomo.initialPomodoro());
const LABEL: Record<pomo.Phase, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};
const mmss = (ms: number) =>
  `${String(Math.floor(ms / 60_000)).padStart(2, "0")}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`;

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* audio not available: the toast still shows */
  }
}

/** Advances the phase when time is up. Mounted by the face, so it runs while the dock is visible. */
function usePomodoroTicker(item: FaceProps["item"], active: boolean) {
  const [s, setS] = useJsonOption(item, "state", parsePomo);
  const now = useNow(active && s.running, 500);
  useEffect(() => {
    const r = pomo.tick(s, now);
    if (!r.finished) return;
    setS(r.state);
    beep();
    useDock
      .getState()
      .report(
        r.finished === "focus" ? "Focus session done. Take a break." : "Break over. Back to focus.",
      );
  });
  return [s, setS, now] as const;
}

export function PomodoroFace({ item, active }: FaceProps) {
  const [s, , now] = usePomodoroTicker(item, active);
  return (
    <Stack>
      <Big>{mmss(pomo.timeLeft(s, now))}</Big>
      <Small>{LABEL[s.phase]}</Small>
    </Stack>
  );
}

export function PomodoroPanel({ item }: PanelProps) {
  const [s, setS, now] = usePomodoroTicker(item, true);
  return (
    <div className="space-y-3">
      <div className="text-sm opacity-70">
        {LABEL[s.phase]} · {s.done} done
      </div>
      <div className="text-4xl font-semibold tabular-nums">{mmss(pomo.timeLeft(s, now))}</div>
      <div className="flex gap-2">
        <Btn primary onClick={() => setS(pomo.toggle(s, Date.now()))}>
          {s.running ? "Pause" : "Start"}
        </Btn>
        <Btn onClick={() => setS(pomo.skip(s, Date.now()))}>Skip</Btn>
        <Btn onClick={() => setS(pomo.resetPomodoro())}>Reset</Btn>
      </div>
      <Note>25 min focus, 5 min break, 15 min after every 4th session.</Note>
    </div>
  );
}

export function CountdownFace({ item, active }: FaceProps) {
  const [date] = useOption(item, "date");
  const [label] = useOption(item, "label", "Event");
  const days = daysUntil(date, new Date(useNow(active, 60_000)));
  if (days === null) return <Small>Set a date</Small>;
  return (
    <Stack>
      <Big>{countdownLabel(days)}</Big>
      <Small>{label}</Small>
    </Stack>
  );
}

export function CountdownPanel({ item }: PanelProps) {
  const [date, setDate] = useOption(item, "date");
  const [label, setLabel] = useOption(item, "label", "Event");
  const days = daysUntil(date, new Date());
  const field = "w-full rounded-lg bg-white/15 px-2 py-1 outline-none";
  return (
    <div className="space-y-2 text-sm">
      <input
        aria-label="Event name"
        className={field}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <input
        aria-label="Event date"
        type="date"
        className={field}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <div className="text-lg font-semibold">
        {days === null ? "Pick a date" : countdownLabel(days)}
      </div>
    </div>
  );
}

const DEFAULT_ZONES = "America/New_York,Europe/London,Asia/Tokyo";
const zonesOf = (raw: string) =>
  raw
    .split(",")
    .map((z) => z.trim())
    .filter(isValidTimeZone)
    .slice(0, 6);

export function WorldClockFace({ item, active, wide }: FaceProps) {
  const [raw] = useOption(item, "zones", DEFAULT_ZONES);
  const now = new Date(useNow(active, 15_000));
  const zones = zonesOf(raw).slice(0, wide ? 2 : 1);
  return (
    <span
      className={`flex ${wide ? "flex-row gap-3" : "flex-col"} items-center justify-center px-1`}
    >
      {zones.map((z) => (
        <Stack key={z}>
          <Big>{timeIn(z, now)}</Big>
          <Small>{cityOf(z)}</Small>
        </Stack>
      ))}
    </span>
  );
}

export function WorldClockPanel({ item }: PanelProps) {
  const [raw, setRaw] = useOption(item, "zones", DEFAULT_ZONES);
  const now = new Date(useNow(true, 15_000));
  return (
    <div className="space-y-2 text-sm">
      {zonesOf(raw).map((z) => (
        <div key={z} className="flex justify-between">
          <span>{cityOf(z)}</span>
          <span className="tabular-nums">{timeIn(z, now)}</span>
        </div>
      ))}
      <input
        aria-label="Time zones"
        className="w-full rounded-lg bg-white/15 px-2 py-1 text-xs outline-none"
        defaultValue={raw}
        onBlur={(e) => setRaw(e.target.value)}
      />
      <Note>
        IANA names separated by commas, for example Europe/Prague. Invalid names are ignored.
      </Note>
    </div>
  );
}
