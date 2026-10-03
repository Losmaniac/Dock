import { useState } from "react";
import { useNow } from "../hooks/usePolled";
import { monthGrid } from "../lib/monthgrid";
import { useOption } from "./hooks";
import type { FaceProps, PanelProps } from "./types";
import { Big, Btn, Small, Stack } from "./ui";

const hhmm = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});
const dayFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

function Analog({ now, size }: { now: Date; size: number }) {
  const s = now.getSeconds(),
    m = now.getMinutes() + s / 60,
    h = (now.getHours() % 12) + m / 60;
  const hand = (deg: number, len: number, w: number) => (
    <line
      x1="50"
      y1="50"
      x2="50"
      y2={50 - len}
      strokeWidth={w}
      strokeLinecap="round"
      transform={`rotate(${deg} 50 50)`}
      stroke="currentColor"
    />
  );
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".35"
        strokeWidth="3"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1="8"
          x2="50"
          y2={i % 3 === 0 ? 16 : 12}
          stroke="currentColor"
          strokeOpacity=".6"
          strokeWidth="2"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      {hand(h * 30, 24, 4)}
      {hand(m * 6, 34, 3)}
      <g stroke="var(--accent)">{hand(s * 6, 38, 1.5)}</g>
    </svg>
  );
}

export function ClockFace({ item, active, wide }: FaceProps) {
  const [style] = useOption(item, "style", "digital");
  const now = new Date(useNow(active));
  if (style === "analog") return <Analog now={now} size={wide ? 52 : 44} />;
  return (
    <Stack>
      <Big>{hhmm.format(now)}</Big>
      <Small>{dayFmt.format(now)}</Small>
    </Stack>
  );
}

export function ClockPanel({ item }: PanelProps) {
  const [style, setStyle] = useOption(item, "style", "digital");
  const now = new Date(useNow(true));
  return (
    <div className="space-y-3">
      <div className="text-3xl font-semibold tabular-nums">
        {new Intl.DateTimeFormat(undefined, { timeStyle: "medium", hour12: false }).format(now)}
      </div>
      <div className="opacity-70">
        {new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(now)}
      </div>
      <div className="flex gap-2">
        <Btn primary={style === "digital"} onClick={() => setStyle("digital")}>
          Digital
        </Btn>
        <Btn primary={style === "analog"} onClick={() => setStyle("analog")}>
          Analog
        </Btn>
      </div>
    </div>
  );
}

export function DateFace({ active }: FaceProps) {
  const now = new Date(useNow(active, 60_000));
  return (
    <Stack>
      <Small>{new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(now)}</Small>
      <span className="text-xl font-bold leading-none">{now.getDate()}</span>
      <Small>{new Intl.DateTimeFormat(undefined, { month: "short" }).format(now)}</Small>
    </Stack>
  );
}

export function DatePanel() {
  const now = new Date(useNow(true, 60_000));
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const weeks = monthGrid(view.y, view.m);
  const shift = (d: number) =>
    setView(({ y, m }) => {
      const t = new Date(y, m + d, 1);
      return { y: t.getFullYear(), m: t.getMonth() };
    });
  return (
    <div className="text-sm">
      <div className="mb-2 flex items-center justify-between">
        <Btn onClick={() => shift(-1)} label="Previous month">
          ‹
        </Btn>
        <span className="font-semibold">
          {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
            new Date(view.y, view.m, 1),
          )}
        </span>
        <Btn onClick={() => shift(1)} label="Next month">
          ›
        </Btn>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="opacity-60">
            {d}
          </span>
        ))}
        {weeks.flat().map((d, i) => {
          const today =
            d === now.getDate() && view.m === now.getMonth() && view.y === now.getFullYear();
          return (
            <span
              key={i}
              className={`rounded-full py-0.5 tabular-nums ${today ? "bg-accent text-white" : ""}`}
            >
              {d ?? ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
