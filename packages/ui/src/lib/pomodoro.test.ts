import { describe, expect, it } from "vitest";
import { initialPomodoro, skip, tick, timeLeft, toggle } from "./pomodoro";

describe("pomodoro", () => {
  it("counts down while running and freezes when paused", () => {
    let s = toggle(initialPomodoro(), 0);
    expect(timeLeft(s, 60_000)).toBe(24 * 60_000);
    s = toggle(s, 60_000);
    expect(timeLeft(s, 10_000_000)).toBe(24 * 60_000);
  });
  it("moves from focus to a short break, then back, with a long break after 4 sessions", () => {
    let s = toggle(initialPomodoro(), 0);
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      s = { ...s, endsAt: 1 };
      const r = tick(s, 2);
      expect(r.finished).toBe("focus");
      s = r.state;
      seen.push(s.phase);
      s = { ...s, endsAt: 1 };
      s = tick(s, 2).state; // break ends
    }
    expect(seen).toEqual(["short", "short", "short", "long"]);
    expect(s.done).toBe(4);
  });
  it("does nothing before the end time or when paused", () => {
    const s = toggle(initialPomodoro(), 0);
    expect(tick(s, 1000).finished).toBeNull();
    expect(tick(initialPomodoro(), 1e12).finished).toBeNull();
  });
  it("skip keeps the running flag", () =>
    expect(skip(toggle(initialPomodoro(), 0), 5).running).toBe(true));
});
