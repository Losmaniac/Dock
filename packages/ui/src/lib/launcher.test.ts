import { describe, expect, it } from "vitest";
import type { StartApp } from "@glass-dock/shared";
import { buildSections, categoriesOf } from "./launcher";

const apps: StartApp[] = [
  { name: "Notepad", path: "C:\\n.lnk", category: "Accessories" },
  { name: "Paint", path: "C:\\p.lnk", category: "Accessories" },
  { name: "Firefox", path: "C:\\f.lnk", category: "Apps" },
  { name: "Photos", aumid: "P!App", category: "Store apps" },
];
const base = {
  query: "",
  category: null,
  apps,
  pinned: [apps[2]!],
  recents: [{ name: "a.txt", path: "C:\\a.txt", isDir: false }],
  docs: [],
};

describe("launcher sections", () => {
  it("home shows pinned apps, recent files and settings", () => {
    expect(buildSections(base).map((s) => s.heading)).toEqual([
      "Pinned",
      "Recent files",
      "Settings",
    ]);
  });
  it("a category lists only its apps", () => {
    const s = buildSections({ ...base, category: "Accessories" });
    expect(s).toHaveLength(1);
    expect(s[0]!.rows.map((r) => r.title)).toEqual(["Notepad", "Paint"]);
  });
  it("a query searches apps, settings and documents together", () => {
    const s = buildSections({
      ...base,
      query: "no",
      docs: [{ name: "notes.txt", path: "C:\\notes.txt", isDir: false }],
    });
    expect(s.map((x) => x.heading)).toContain("Apps");
    expect(s.map((x) => x.heading)).toContain("Documents");
    expect(s[0]!.rows[0]!.title).toBe("Notepad");
  });
  it("finds Windows and dock settings by name", () => {
    expect(buildSections({ ...base, query: "wifi" })[0]!.rows[0]!.title).toBe("Network and Wi-Fi");
    expect(buildSections({ ...base, query: "zzzz" })).toEqual([]);
    expect(buildSections({ ...base, query: "display" })[0]!.rows[0]!.title).toBe("Display");
    expect(buildSections({ ...base, query: "glass dock" })[0]!.rows[0]!.kind).toBe("dock-settings");
  });
  it("lists categories with Apps first", () =>
    expect(categoriesOf(apps)).toEqual(["Apps", "Accessories", "Store apps"]));
});
