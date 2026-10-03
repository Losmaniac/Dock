import { useEffect, useState } from "react";

const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const date = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

/** Mounted only while visible, so a hidden clock costs no timers. */
export function ClockWidget({ size }: { size: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      style={{ width: size, height: size }}
      className="flex flex-col items-center justify-center rounded-item bg-white/10 leading-tight"
    >
      <span className="text-base font-semibold tabular-nums">{time.format(now)}</span>
      <span className="text-[10px] opacity-70">{date.format(now)}</span>
    </span>
  );
}
