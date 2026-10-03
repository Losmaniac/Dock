/**
 * Minimal read-only iCalendar parsing for the "next event" widget.
 * Supports: line unfolding, DTSTART as UTC (Z), floating local time or all-day DATE, SUMMARY.
 * Not supported (documented limits): RRULE recurrence, TZID zones (treated as local time).
 */
export interface CalEvent {
  title: string;
  start: Date;
  allDay: boolean;
}

const unfold = (text: string) => text.replace(/\r?\n[ \t]/g, "");
const unescape = (s: string) => s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1");

function parseStart(params: string, value: string): { start: Date; allDay: boolean } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  const allDay = h === undefined || /VALUE=DATE(?!-)/i.test(params);
  const nums = [y, mo, d, h ?? "0", mi ?? "0", s ?? "0"].map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const start = z
    ? new Date(Date.UTC(nums[0], nums[1] - 1, nums[2], nums[3], nums[4], nums[5]))
    : new Date(nums[0], nums[1] - 1, nums[2], nums[3], nums[4], nums[5]);
  return Number.isNaN(start.getTime()) ? null : { start, allDay };
}

export function parseIcs(text: string): CalEvent[] {
  const events: CalEvent[] = [];
  let cur: { title?: string; start?: Date; allDay?: boolean } | null = null;
  for (const line of unfold(text).split(/\r?\n/)) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur?.start)
        events.push({ title: cur.title || "(no title)", start: cur.start, allDay: !!cur.allDay });
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const [name = "", ...params] = line.slice(0, idx).split(";");
      const value = line.slice(idx + 1);
      if (name === "SUMMARY") cur.title = unescape(value);
      else if (name === "DTSTART") {
        const p = parseStart(params.join(";"), value);
        if (p) Object.assign(cur, p);
      }
    }
  }
  return events;
}

/** Earliest event that has not started yet (all-day events count from the start of their day). */
export function nextEvent(events: CalEvent[], now: Date): CalEvent | null {
  const upcoming = events
    .filter((e) => e.start.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  return upcoming[0] ?? null;
}
