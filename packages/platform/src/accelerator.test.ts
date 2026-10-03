import { describe, expect, it } from "vitest";
import { matchesAccelerator } from "./accelerator";

const ev = (o: Partial<KeyboardEvent>) => ({
  key: "",
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...o,
});

describe("matchesAccelerator", () => {
  it("matches Ctrl+Space", () =>
    expect(matchesAccelerator(ev({ key: " ", ctrlKey: true }), "Ctrl+Space")).toBe(true));
  it("requires exact modifiers", () => {
    expect(matchesAccelerator(ev({ key: " ", ctrlKey: true, shiftKey: true }), "Ctrl+Space")).toBe(
      false,
    );
    expect(matchesAccelerator(ev({ key: " " }), "Ctrl+Space")).toBe(false);
  });
  it("matches digits and arrows", () => {
    expect(matchesAccelerator(ev({ key: "3", ctrlKey: true, altKey: true }), "Ctrl+Alt+3")).toBe(
      true,
    );
    expect(
      matchesAccelerator(ev({ key: "ArrowLeft", ctrlKey: true, altKey: true }), "Ctrl+Alt+Left"),
    ).toBe(true);
  });
  it("never matches an empty accelerator", () =>
    expect(matchesAccelerator(ev({ key: "a" }), "")).toBe(false));
});
