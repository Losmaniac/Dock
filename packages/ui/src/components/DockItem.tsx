import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useRef, type CSSProperties, type ReactNode } from "react";
import type { DockPosition } from "@glass-dock/shared";
import { magnifyScale } from "../lib/magnify";
import { isHorizontal } from "../lib/geometry";

export interface DockItemProps {
  id: string;
  label: string;
  icon?: string | undefined;
  fallback?: ReactNode;
  size: number;
  magnification: number;
  pointer: MotionValue<number>;
  position: DockPosition;
  windowCount?: number;
  running?: boolean;
  focused?: boolean;
  minimized?: boolean;
  badge?: number;
  /** Widget tiles can be twice as wide as an icon. */
  wide?: boolean;
  /** Hops while an app is starting. */
  bouncing?: boolean;
  /** Item center along the bar axis (viewport px) while hovered; null when the pointer leaves. */
  onHover?: (center: number | null) => void;
  onClick: () => void;
  onAux?: () => void;
  onContext?: () => void;
}

const RADIUS = 140;

/** Hop away from the screen edge and back, along the axis perpendicular to the dock. */
function bounceAnimation(pos: DockPosition, size: number) {
  const dist = Math.round(size * 0.45);
  const toward = pos === "top" || pos === "left" ? dist : -dist; // away from the edge
  const frames = [0, toward, 0, toward / 2, 0];
  return isHorizontal(pos) ? { y: frames } : { x: frames };
}
const ORIGIN: Record<DockPosition, string> = {
  bottom: "50% 100%",
  top: "50% 0%",
  left: "0% 50%",
  right: "100% 50%",
};

function tooltipStyle(p: DockPosition, offset: number): CSSProperties {
  switch (p) {
    case "bottom":
      return { bottom: "100%", marginBottom: offset, left: "50%", transform: "translateX(-50%)" };
    case "top":
      return { top: "100%", marginTop: offset, left: "50%", transform: "translateX(-50%)" };
    case "left":
      return { left: "100%", marginLeft: offset, top: "50%", transform: "translateY(-50%)" };
    case "right":
      return { right: "100%", marginRight: offset, top: "50%", transform: "translateY(-50%)" };
  }
}

export function DockItem(p: DockItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const horizontal = isHorizontal(p.position);
  const reduced = useReducedMotion();
  const max = reduced ? 1 : p.magnification;
  // The item's center is measured once when the pointer enters the dock, not on every move:
  // reading layout 60 times a second per item would force reflows. Layout does not change
  // while magnifying (only transforms do), so the cached value stays valid until the pointer leaves.
  const center = useRef<number | null>(null);
  const scale = useTransform(p.pointer, (v) => {
    if (!Number.isFinite(v)) {
      center.current = null;
      return 1;
    }
    if (center.current === null) {
      const b = ref.current?.getBoundingClientRect();
      if (!b) return 1;
      center.current = horizontal ? b.left + b.width / 2 : b.top + b.height / 2;
    }
    return magnifyScale(v - center.current, max, RADIUS);
  });
  const smooth = useSpring(scale, { stiffness: 400, damping: 30, mass: 0.4 });
  const lit = p.running ? (p.focused ? "bg-accent" : "bg-white/80") : "bg-transparent";

  return (
    <div
      data-item-id={p.id}
      onPointerEnter={() => {
        const b = ref.current?.getBoundingClientRect();
        if (b) p.onHover?.(horizontal ? b.left + b.width / 2 : b.top + b.height / 2);
      }}
      onPointerLeave={() => p.onHover?.(null)}
      className={`group relative flex items-center ${horizontal ? "flex-col" : "flex-row"}`}
    >
      <span
        style={tooltipStyle(p.position, p.size * (p.magnification - 1) + 8)}
        className="panel pointer-events-none absolute z-10 whitespace-nowrap px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {p.label}
      </span>
      <motion.button
        ref={ref}
        type="button"
        aria-label={p.label}
        onClick={p.onClick}
        onAuxClick={(e) => e.button === 1 && p.onAux?.()}
        onKeyDown={(e) => {
          if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            e.preventDefault();
            p.onContext?.();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          p.onContext?.();
        }}
        style={{
          width: p.wide ? p.size * 2 + 8 : p.size,
          height: p.size,
          scale: smooth,
          transformOrigin: ORIGIN[p.position],
        }}
        whileTap={{ scale: 0.92 }}
        animate={p.bouncing && !reduced ? bounceAnimation(p.position, p.size) : { y: 0, x: 0 }}
        transition={p.bouncing ? { duration: 0.7, repeat: 2, ease: "easeOut" } : undefined}
        className="relative rounded-item outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {p.icon ? (
          <img src={p.icon} alt="" draggable={false} className="h-full w-full rounded-item" />
        ) : (
          <span className="flex h-full w-full items-center justify-center overflow-hidden whitespace-nowrap rounded-item bg-white/10 text-lg">
            {p.fallback ?? p.label.slice(0, 1).toUpperCase()}
          </span>
        )}
        {(p.badge ?? 0) > 0 && (
          <span
            aria-label={`${p.badge} unread`}
            className="absolute -left-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 text-white"
          >
            {p.badge}
          </span>
        )}
        {(p.windowCount ?? 0) > 1 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-white">
            {p.windowCount}
          </span>
        )}
      </motion.button>
      <span
        aria-hidden
        className={`h-1 w-1 rounded-full ${horizontal ? "mt-1" : "ml-1"} ${lit} ${
          p.minimized ? "opacity-40" : ""
        }`}
      />
    </div>
  );
}
