export type Phase = "focus" | "short" | "long";

export interface PomodoroState {
  phase: Phase;
  running: boolean;
  /** Wall-clock ms when the running phase ends. */
  endsAt: number;
  /** Time left while paused. */
  remaining: number;
  /** Completed focus sessions. */
  done: number;
}

export const MINUTES: Record<Phase, number> = { focus: 25, short: 5, long: 15 };
const ms = (p: Phase) => MINUTES[p] * 60_000;

export const initialPomodoro = (): PomodoroState => ({
  phase: "focus",
  running: false,
  endsAt: 0,
  remaining: ms("focus"),
  done: 0,
});

export const timeLeft = (s: PomodoroState, now: number) =>
  s.running ? Math.max(0, s.endsAt - now) : s.remaining;

export const toggle = (s: PomodoroState, now: number): PomodoroState =>
  s.running
    ? { ...s, running: false, remaining: timeLeft(s, now) }
    : { ...s, running: true, endsAt: now + s.remaining };

/** The phase that follows `s`: a long break after every 4th focus session. */
export function nextPhase(s: PomodoroState): { phase: Phase; done: number } {
  if (s.phase !== "focus") return { phase: "focus", done: s.done };
  const done = s.done + 1;
  return { phase: done % 4 === 0 ? "long" : "short", done };
}

export const skip = (s: PomodoroState, now: number): PomodoroState => {
  const n = nextPhase(s);
  return {
    phase: n.phase,
    done: n.done,
    running: s.running,
    remaining: ms(n.phase),
    endsAt: now + ms(n.phase),
  };
};

/** Call on a timer; advances to the next phase when time ran out. `finished` tells the UI to notify. */
export function tick(
  s: PomodoroState,
  now: number,
): { state: PomodoroState; finished: Phase | null } {
  if (!s.running || now < s.endsAt) return { state: s, finished: null };
  return { state: skip(s, now), finished: s.phase };
}

export const resetPomodoro = initialPomodoro;
