import { useEffect, useState } from "react";

const time = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});
const date = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

/** Mounted only while visible, so a hidden clock costs no timers. */
export function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="flex flex-col items-center justify-center whitespace-nowrap leading-tight">
      <span className="text-sm font-semibold tabular-nums">{time.format(now)}</span>
      <span className="text-[10px] opacity-70">{date.format(now)}</span>
    </span>
  );
}
