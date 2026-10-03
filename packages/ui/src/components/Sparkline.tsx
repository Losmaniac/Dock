/** 0..100 values as a polyline; decorative, the number next to it carries the meaning. */
export function Sparkline({
  values,
  color = "var(--accent)",
  w = 240,
  h = 40,
}: {
  values: number[];
  color?: string;
  w?: number;
  h?: number;
}) {
  if (values.length < 2) return <svg width={w} height={h} aria-hidden />;
  const step = w / 59;
  const pts = values.map(
    (v, i) =>
      `${(w - (values.length - 1 - i) * step).toFixed(1)},${(h - (Math.min(100, Math.max(0, v)) / 100) * h).toFixed(1)}`,
  );
  return (
    <svg width={w} height={h} aria-hidden>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
