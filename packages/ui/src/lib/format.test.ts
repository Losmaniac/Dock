import { describe, expect, it } from "vitest";
import { formatRate } from "../hooks/useInfoFeeds";

describe("formatRate", () => {
  it("scales units and uses a decimal comma", () => {
    expect(formatRate(512)).toBe("512 B/s");
    expect(formatRate(1500)).toBe("1,5 KB/s");
    expect(formatRate(42_000_000)).toBe("42 MB/s");
  });
});
