import { motion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { magnifyScale } from "../lib/magnify";

interface Props {
  label: string;
  icon: string | undefined;
  size: number;
  magnification: number;
  mouseX: MotionValue<number>;
  running: boolean;
  focused: boolean;
  minimized: boolean;
  onClick: () => void;
}

const RADIUS = 140;

export function DockItem(p: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const scale = useTransform(p.mouseX, (x) => {
    const b = ref.current?.getBoundingClientRect();
    if (!b || !Number.isFinite(x)) return 1;
    return magnifyScale(x - (b.left + b.width / 2), p.magnification, RADIUS);
  });
  const smooth = useSpring(scale, { stiffness: 400, damping: 30, mass: 0.4 });

  return (
    <div className="group relative flex flex-col items-center">
      <span
        style={{ top: -(p.size * (p.magnification - 1)) - 32 }}
        className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-black/60 px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
      >
        {p.label}
      </span>
      <motion.button
        ref={ref}
        type="button"
        aria-label={p.label}
        onClick={p.onClick}
        style={{ width: p.size, height: p.size, scale: smooth, transformOrigin: "bottom center" }}
        whileTap={{ scale: 0.92 }}
        className="rounded-item outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {p.icon && (
          <img src={p.icon} alt="" draggable={false} className="h-full w-full rounded-item" />
        )}
      </motion.button>
      <span
        aria-hidden
        className={`mt-1 h-1 w-1 rounded-full ${
          p.running ? (p.focused ? "bg-accent" : "bg-white/80") : "bg-transparent"
        } ${p.minimized ? "opacity-40" : ""}`}
      />
    </div>
  );
}
