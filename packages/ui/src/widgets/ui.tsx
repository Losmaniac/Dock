import type { ReactNode } from "react";

/** Shared small building blocks for widget faces and panels. */
export const Big = ({ children }: { children: ReactNode }) => (
  <span className="max-w-full truncate text-[13px] font-semibold tabular-nums leading-tight">
    {children}
  </span>
);
export const Small = ({ children }: { children: ReactNode }) => (
  <span className="max-w-full truncate text-[10px] leading-tight opacity-75">{children}</span>
);
export const Stack = ({ children }: { children: ReactNode }) => (
  <span className="flex min-w-0 max-w-full flex-col items-center justify-center px-1 text-center">
    {children}
  </span>
);
export const Btn = (p: {
  children: ReactNode;
  onClick: () => void;
  label?: string;
  primary?: boolean;
}) => (
  <button
    aria-label={p.label}
    onClick={p.onClick}
    className={`rounded-lg px-3 py-1 text-sm ${p.primary ? "bg-accent text-white" : "bg-white/15 hover:bg-white/25"}`}
  >
    {p.children}
  </button>
);
export const Bar = ({ pct, color = "var(--accent)" }: { pct: number; color?: string }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-white/15" role="presentation">
    <div
      className="h-full rounded-full"
      style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
    />
  </div>
);
export const Note = ({ children }: { children: ReactNode }) => (
  <p className="text-xs opacity-60">{children}</p>
);
