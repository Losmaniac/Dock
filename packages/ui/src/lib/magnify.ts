/**
 * Pure magnification math (unit-tested). `distance` is the pointer's distance in px from
 * the item's center along the dock axis. Scale falls off with a raised-cosine curve so the
 * peak is smooth and neighbours within `radius` px are lifted.
 */
export function magnifyScale(distance: number, maxScale: number, radius: number): number {
  const d = Math.abs(distance);
  if (maxScale <= 1 || d >= radius) return 1;
  const t = d / radius; // 0 at center, 1 at the edge
  return 1 + (maxScale - 1) * (0.5 + 0.5 * Math.cos(Math.PI * t));
}
