import { describe, expect, it } from "vitest";
import { nextEvent, parseIcs } from "./ics";

const ics = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "DTSTART:20300105T093000Z",
  "SUMMARY:Stand-up\\, daily",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20300106",
  "SUMMARY:Holiday",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20200101T100000",
  "SUMMARY:Old, folded",
  "  line",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "SUMMARY:No start",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("ics", () => {
  const events = parseIcs(ics);
  it("parses UTC, all-day and floating events and unfolds lines", () => {
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ title: "Stand-up, daily", allDay: false });
    expect(events[0]!.start.toISOString()).toBe("2030-01-05T09:30:00.000Z");
    expect(events[1]).toMatchObject({ title: "Holiday", allDay: true });
    expect(events[2]!.title).toBe("Old, folded line");
  });
  it("picks the earliest upcoming event", () => {
    expect(nextEvent(events, new Date("2029-12-31T00:00:00Z"))?.title).toBe("Stand-up, daily");
    expect(nextEvent(events, new Date("2030-01-05T10:00:00Z"))?.title).toBe("Holiday");
    expect(nextEvent(events, new Date("2031-01-01T00:00:00Z"))).toBeNull();
  });
});
