import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrast, over, parseRgba } from "./contrast";

const css = readFileSync(new URL("../styles/extra.css", import.meta.url), "utf8");

/** Reads the real token values so the test cannot drift from the stylesheet. */
function tokens(theme: "light" | "dark") {
  const block = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`).exec(css)![1]!;
  const get = (name: string) =>
    /:\s*(.+);/.exec(new RegExp(`${name}:[^;]+;`).exec(block)![0])![1]!.trim();
  const hex = get("--text");
  const n = parseInt(
    hex.slice(1).length === 3 ? hex.slice(1).replace(/./g, "$&$&") : hex.slice(1),
    16,
  );
  return {
    panel: parseRgba(get("--panel-bg")),
    text: [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number],
  };
}

const BACKDROPS: [number, number, number][] = [
  [0, 0, 0],
  [255, 255, 255],
  [128, 128, 128],
  [255, 0, 80],
];

describe("panel text contrast (worst case over any backdrop)", () => {
  for (const theme of ["light", "dark"] as const) {
    it(`${theme} theme reaches WCAG AA 4,5:1`, () => {
      const { panel, text } = tokens(theme);
      const worst = Math.min(...BACKDROPS.map((b) => contrast(text, over(panel, b))));
      expect(worst).toBeGreaterThanOrEqual(4.5);
    });
  }
});
