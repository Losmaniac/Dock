/** Small pure helpers for the time-related widgets. */

export function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86_400);
  const h = Math.floor((secs % 86_400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** Whole days between now and a `YYYY-MM-DD` target (negative once passed); null if invalid. */
export function daysUntil(isoDate: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function countdownLabel(days: number): string {
  if (days === 0) return "Today";
  const n = Math.abs(days);
  const unit = n === 1 ? "day" : "days";
  return days > 0 ? `${n} ${unit}` : `${n} ${unit} ago`;
}

export const isValidTimeZone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export function timeIn(tz: string, now: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

export const cityOf = (tz: string): string => (tz.split("/").pop() ?? tz).replace(/_/g, " ");

/** Binary size with a space separator and decimal comma: `1,5 GB`. Uses decimal units like Windows Explorer. */
export function formatBytes(n: number): string {
  const u = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1000 && i < u.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0).replace(".", ",")} ${u[i]}`;
}
