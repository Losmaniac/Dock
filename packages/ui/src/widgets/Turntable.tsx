/**
 * An original record-player drawing: plinth, platter, vinyl with grooves, a label that shows the
 * album art, and a tonearm that swings across the record as the track progresses.
 */
const FINISH: Record<string, { plinth: string; edge: string; arm: string }> = {
  silver: { plinth: "#d4d8de", edge: "#9aa1ab", arm: "#6b7280" },
  black: { plinth: "#1c1d22", edge: "#0b0b0e", arm: "#c9ccd3" },
  walnut: { plinth: "#6b4423", edge: "#3f2813", arm: "#d8c9a8" },
  retro: { plinth: "#d9643a", edge: "#8f3a1c", arm: "#f3e3c3" },
};

export function Turntable(p: {
  size: number;
  finish: string;
  cover: string | null;
  playing: boolean;
  progress: number;
  compact?: boolean;
}) {
  const f = FINISH[p.finish] ?? FINISH.black!;
  // Arm angle: resting off the record at -28deg, then 6deg (outer groove) to 34deg (inner groove).
  const angle = p.playing || p.progress > 0 ? 6 + 28 * Math.min(1, Math.max(0, p.progress)) : -28;
  return (
    <svg width={p.size} height={p.size} viewBox="0 0 100 100" role="img" aria-label="Record player">
      <style>{`.gd-spin{animation:gd-spin 2.4s linear infinite;transform-origin:44px 52px}@keyframes gd-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.gd-spin{animation:none}}`}</style>
      <rect
        x="4"
        y="6"
        width="92"
        height="88"
        rx="9"
        fill={f.plinth}
        stroke={f.edge}
        strokeWidth="2"
      />
      <circle cx="44" cy="52" r="37" fill={f.edge} opacity=".55" />
      <g className="gd-spin" style={{ animationPlayState: p.playing ? "running" : "paused" }}>
        <circle cx="44" cy="52" r="34" fill="#0d0d10" />
        {[30, 26, 22, 18].map((r) => (
          <circle
            key={r}
            cx="44"
            cy="52"
            r={r}
            fill="none"
            stroke="#fff"
            strokeOpacity=".07"
            strokeWidth=".8"
          />
        ))}
        <circle cx="44" cy="52" r="12" fill="#e0b84a" />
        {p.cover && (
          <>
            <clipPath id="gd-label">
              <circle cx="44" cy="52" r="12" />
            </clipPath>
            <image
              href={p.cover}
              x="32"
              y="40"
              width="24"
              height="24"
              clipPath="url(#gd-label)"
              preserveAspectRatio="xMidYMid slice"
            />
          </>
        )}
        <circle cx="44" cy="52" r="1.6" fill="#0d0d10" />
      </g>
      {!p.compact && <circle cx="86" cy="16" r="3" fill={f.arm} opacity=".6" />}
      <g
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: "86px 18px",
          transition: "transform 0.6s ease",
        }}
      >
        <circle cx="86" cy="18" r="4.5" fill={f.arm} />
        <line
          x1="86"
          y1="18"
          x2="86"
          y2="66"
          stroke={f.arm}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect x="83" y="64" width="6" height="9" rx="1.5" fill={f.arm} />
      </g>
    </svg>
  );
}
