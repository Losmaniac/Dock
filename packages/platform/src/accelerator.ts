/** Minimal accelerator matcher for the web demo (the desktop build uses the OS). */
const ALIASES: Record<string, string> = {
  control: "ctrl",
  ctrl: "ctrl",
  alt: "alt",
  shift: "shift",
  super: "meta",
  win: "meta",
  meta: "meta",
  space: " ",
  left: "arrowleft",
  right: "arrowright",
  up: "arrowup",
  down: "arrowdown",
};

export function matchesAccelerator(
  e: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">,
  accelerator: string,
): boolean {
  const parts = accelerator
    .split("+")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return false;
  const want = { ctrl: false, alt: false, shift: false, meta: false };
  let key = "";
  for (const raw of parts) {
    const p = ALIASES[raw] ?? raw;
    if (p in want) want[p as keyof typeof want] = true;
    else key = p;
  }
  return (
    key !== "" &&
    e.key.toLowerCase() === key &&
    e.ctrlKey === want.ctrl &&
    e.altKey === want.alt &&
    e.shiftKey === want.shift &&
    e.metaKey === want.meta
  );
}
