import { useEffect, useState } from "react";

/** Polls `fn` every `everyMs` while `active`; nothing runs (zero cost) otherwise. */
export function usePolled<T>(
  fn: () => Promise<T>,
  everyMs: number,
  active: boolean,
  deps: unknown[] = [],
): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const tick = () =>
      void fn()
        .then((v) => alive && setValue(v))
        .catch(() => alive && setValue(null));
    tick();
    const t = setInterval(tick, everyMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // `fn` is recreated each render by callers; `deps` lists what really changes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, everyMs, ...deps]);
  return value;
}

/** Current time in ms, updating every `everyMs` only while `active`. */
export function useNow(active: boolean, everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [active, everyMs]);
  return now;
}
