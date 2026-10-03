import type { ReactNode } from "react";

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Slider(p: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <span className="flex items-center gap-2">
      <input
        type="range"
        min={p.min}
        max={p.max}
        step={p.step}
        value={p.value}
        onChange={(e) => p.onChange(Number(e.target.value))}
        className="w-36 accent-[var(--accent)]"
      />
      <span className="w-12 text-right text-xs tabular-nums opacity-70">
        {(p.format ?? String)(p.value)}
      </span>
    </span>
  );
}

export function Select<T extends string>(p: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={p.value}
      onChange={(e) => p.onChange(e.target.value as T)}
      className="rounded-lg bg-white/15 px-2 py-1 text-sm outline-none"
    >
      {p.options.map((o) => (
        <option key={o.value} value={o.value} className="text-black">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      role="switch"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
      className="h-5 w-9 cursor-pointer accent-[var(--accent)]"
    />
  );
}

export function Color({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-10 cursor-pointer rounded bg-transparent"
    />
  );
}

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-3">
    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">{title}</h3>
    {children}
  </section>
);
