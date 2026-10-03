import { describe, expect, it } from "vitest";
import { elapsed, formatElapsed, initialStopwatch, lap, toggle } from "./stopwatch";

describe("stopwatch", () => {
  it("accumulates across start/stop cycles", () => {
    let s = toggle(initialStopwatch(), 1000);
    expect(elapsed(s, 3500)).toBe(2500);
    s = toggle(s, 3500);
    expect(elapsed(s, 99_999)).toBe(2500);
    s = toggle(s, 10_000);
    expect(elapsed(s, 11_000)).toBe(3500);
  });
  it("records laps only while running and keeps the last 20", () => {
    expect(lap(initialStopwatch(), 5).laps).toEqual([]);
    let s = toggle(initialStopwatch(), 0);
    for (let i = 1; i <= 25; i++) s = lap(s, i * 100);
    expect(s.laps).toHaveLength(20);
    expect(s.laps.at(-1)).toBe(2500);
  });
  it("formats with a decimal comma and hours when needed", () => {
    expect(formatElapsed(0)).toBe("00:00,00");
    expect(formatElapsed(65_430)).toBe("01:05,43");
    expect(formatElapsed(3_723_000, false)).toBe("1:02:03");
  });
});
