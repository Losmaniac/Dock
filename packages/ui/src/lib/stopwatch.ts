export interface StopwatchState {
  running: boolean;
  /** Wall-clock ms when the current run started. */
  startedAt: number;
  /** Time banked from earlier runs. */
  banked: number;
  laps: number[];
}

export const initialStopwatch = (): StopwatchState => ({
  running: false,
  startedAt: 0,
  banked: 0,
  laps: [],
});

export const elapsed = (s: StopwatchState, now: number): number =>
  s.banked + (s.running ? Math.max(0, now - s.startedAt) : 0);

export const toggle = (s: StopwatchState, now: number): StopwatchState =>
  s.running
    ? { ...s, running: false, banked: elapsed(s, now) }
    : { ...s, running: true, startedAt: now };

export const lap = (s: StopwatchState, now: number): StopwatchState =>
  s.running ? { ...s, laps: [...s.laps, elapsed(s, now)].slice(-20) } : s;

export const reset = (): StopwatchState => initialStopwatch();

/** `1:02:03` / `02:03,45` (decimal comma, as the display convention requires). */
export function formatElapsed(ms: number, centis = true): string {
  const total = Math.floor(ms / 10);
  const cs = total % 100;
  const sec = Math.floor(total / 100) % 60;
  const min = Math.floor(total / 6000) % 60;
  const h = Math.floor(total / 360_000);
  const p = (n: number) => String(n).padStart(2, "0");
  const base = h > 0 ? `${h}:${p(min)}:${p(sec)}` : `${p(min)}:${p(sec)}`;
  return centis ? `${base},${p(cs)}` : base;
}
