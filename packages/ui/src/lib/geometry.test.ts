import { describe, expect, it } from "vitest";
import { computeGeometry, type GeometryInput } from "./geometry";

const base: GeometryInput = {
  position: "bottom",
  autoHide: false,
  revealed: true,
  hovered: false,
  overlay: null,
  nav: { w: 400, h: 80 },
  iconSize: 56,
  magnification: 1.5,
  monitor: "primary",
  reserveSpace: false,
};

describe("computeGeometry", () => {
  it("hugs the bar at rest so transparent pixels never block clicks", () =>
    expect(computeGeometry(base)).toMatchObject({ mode: "rest", length: 400, thickness: 80 }));

  it("adds magnification and tooltip headroom while hovered", () =>
    expect(computeGeometry({ ...base, hovered: true })).toMatchObject({
      mode: "active",
      thickness: 80 + 28 + 36,
    }));

  it("collapses to a hot edge when auto-hide is on and not revealed", () =>
    expect(computeGeometry({ ...base, autoHide: true, revealed: false })).toMatchObject({
      mode: "hidden",
      margin: 0,
    }));

  it("keeps the dock visible while an overlay is open, even if auto-hide would hide it", () =>
    expect(
      computeGeometry({ ...base, autoHide: true, revealed: false, overlay: { w: 460, h: 300 } }),
    ).toMatchObject({ mode: "active", length: 460, thickness: 80 + 12 + 300 }));

  it("reserves bar thickness plus the edge gap only when asked and not auto-hiding", () => {
    expect(computeGeometry({ ...base, reserveSpace: true }).reserve).toBe(80 + 8);
    expect(computeGeometry({ ...base, reserveSpace: false }).reserve).toBe(0);
    expect(computeGeometry({ ...base, reserveSpace: true, autoHide: true }).reserve).toBe(0);
  });

  it("swaps axes for side docks", () =>
    expect(computeGeometry({ ...base, position: "left" })).toMatchObject({
      length: 80,
      thickness: 400,
    }));
});
