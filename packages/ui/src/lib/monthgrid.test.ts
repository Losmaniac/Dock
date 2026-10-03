import { describe, expect, it } from "vitest";
import { monthGrid } from "./monthgrid";

describe("monthGrid", () => {
  it("starts weeks on Monday and pads with nulls", () => {
    // 1 Feb 2030 is a Friday; February 2030 has 28 days.
    const g = monthGrid(2030, 1);
    expect(g[0]).toEqual([null, null, null, null, 1, 2, 3]);
    expect(g.flat().filter((d) => d !== null)).toHaveLength(28);
    expect(g.every((w) => w.length === 7)).toBe(true);
  });
  it("handles a month that starts on Monday", () => expect(monthGrid(2029, 9)[0]![0]).toBe(1)); // 1 Oct 2029
});
