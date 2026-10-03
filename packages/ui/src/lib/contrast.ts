/** WCAG 2.x contrast helpers (AGENTS.md section 6: text on glass must reach 4,5:1). */
export type RGBA = [number, number, number, number];

export function parseRgba(css: string): RGBA {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/.exec(css);
  if (!m) throw new Error(`cannot parse ${css}`);
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
}

export const over = (fg: RGBA, bg: [number, number, number]): [number, number, number] =>
  [0, 1, 2].map((i) => Math.round(fg[i]! * fg[3] + bg[i]! * (1 - fg[3]))) as [
    number,
    number,
    number,
  ];

const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

export function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
