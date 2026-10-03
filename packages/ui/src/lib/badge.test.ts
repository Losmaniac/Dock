import { describe, expect, it } from "vitest";
import { badgeFromTitle, totalBadge } from "./badge";

describe("badgeFromTitle", () => {
  it("reads leading and trailing counts", () => {
    expect(badgeFromTitle("(3) Inbox - Mail")).toBe(3);
    expect(badgeFromTitle("[12] general | Slack")).toBe(12);
    expect(badgeFromTitle("Inbox (5)")).toBe(5);
  });
  it("ignores years, versions and other numbers", () => {
    expect(badgeFromTitle("Report 2024")).toBe(0);
    expect(badgeFromTitle("Notepad (1234)")).toBe(0);
    expect(badgeFromTitle("Untitled")).toBe(0);
  });
  it("sums over windows", () => expect(totalBadge(["(1) a", "(2) b", "c"])).toBe(3));
});
