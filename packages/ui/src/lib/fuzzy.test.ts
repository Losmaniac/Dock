import { describe, expect, it } from "vitest";
import { fuzzyScore, rank } from "./fuzzy";

describe("fuzzy", () => {
  it("requires a subsequence", () => {
    expect(fuzzyScore("vsc", "Visual Studio Code")).not.toBeNull();
    expect(fuzzyScore("xyz", "Visual Studio Code")).toBeNull();
  });
  it("prefers prefixes and word starts over scattered matches", () => {
    const r = rank(["Notepad", "Open Notes", "Phone Notes"], "no", (s) => s);
    expect(r[0]).toBe("Notepad");
  });
  it("is case-insensitive", () => expect(fuzzyScore("CODE", "code")).not.toBeNull());
  it("returns everything (capped) for an empty query", () =>
    expect(rank(["a", "b", "c"], "", (s) => s, 2)).toEqual(["a", "b"]));
  it("ranks 1 000 items in well under 50 ms", () => {
    const items = Array.from(
      { length: 1000 },
      (_, i) => `Application number ${i} with a long name`,
    );
    const t0 = performance.now();
    rank(items, "app 99", (s) => s);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});
