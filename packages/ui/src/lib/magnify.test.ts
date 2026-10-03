import { describe, expect, it } from "vitest";
import { magnifyScale } from "./magnify";

describe("magnifyScale", () => {
  it("peaks at the center", () => expect(magnifyScale(0, 1.6, 120)).toBeCloseTo(1.6));
  it("is 1 at and beyond the radius", () => {
    expect(magnifyScale(120, 1.6, 120)).toBe(1);
    expect(magnifyScale(400, 1.6, 120)).toBe(1);
  });
  it("is symmetric", () =>
    expect(magnifyScale(-40, 1.6, 120)).toBeCloseTo(magnifyScale(40, 1.6, 120)));
  it("decreases monotonically with distance", () => {
    let prev = Infinity;
    for (let d = 0; d <= 120; d += 10) {
      const s = magnifyScale(d, 1.6, 120);
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
  });
  it("is disabled for maxScale <= 1", () => expect(magnifyScale(0, 1, 120)).toBe(1));
});
