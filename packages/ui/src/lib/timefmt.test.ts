import { describe, expect, it } from "vitest";
import {
  cityOf,
  countdownLabel,
  daysUntil,
  formatBytes,
  formatUptime,
  isValidTimeZone,
} from "./timefmt";

describe("timefmt", () => {
  it("formats uptime at three scales", () => {
    expect(formatUptime(59)).toBe("0 min");
    expect(formatUptime(3 * 3600 + 5 * 60)).toBe("3 h 5 min");
    expect(formatUptime(2 * 86_400 + 3 * 3600)).toBe("2 d 3 h");
  });
  it("counts days in whole calendar days", () => {
    const now = new Date(2030, 0, 10, 23, 59);
    expect(daysUntil("2030-01-10", now)).toBe(0);
    expect(daysUntil("2030-01-15", now)).toBe(5);
    expect(daysUntil("2030-01-09", now)).toBe(-1);
    expect(daysUntil("soon", now)).toBeNull();
  });
  it("labels countdowns", () => {
    expect(countdownLabel(0)).toBe("Today");
    expect(countdownLabel(1)).toBe("1 day");
    expect(countdownLabel(-3)).toBe("3 days ago");
  });
  it("validates time zones and names cities", () => {
    expect(isValidTimeZone("Europe/Prague")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
    expect(cityOf("America/New_York")).toBe("New York");
  });
  it("formats bytes with decimal comma", () => {
    expect(formatBytes(999)).toBe("999 B");
    expect(formatBytes(1_500_000_000)).toBe("1,5 GB");
    expect(formatBytes(512e9)).toBe("512 GB");
  });
});
