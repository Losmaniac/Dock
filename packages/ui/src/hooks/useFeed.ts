import { useEffect, useState } from "react";
import { messageOf, useDock } from "../store/dockStore";

export type Feed<T> = { data: T | null; error: string | null; configured: boolean };

/** Fetches only when the user configured it AND the widget is visible. */
export function useFeed<T>(
  url: string,
  active: boolean,
  everyMs: number,
  parse: (text: string) => T | null,
): Feed<T> {
  const platform = useDock((s) => s.platform)!;
  const [state, setState] = useState<{ data: T | null; error: string | null }>({
    data: null,
    error: null,
  });
  useEffect(() => {
    if (!active || !url) return;
    let alive = true;
    const tick = () =>
      platform
        .fetchText(url)
        .then((text) => alive && setState({ data: parse(text), error: null }))
        .catch((e) => alive && setState({ data: null, error: messageOf(e) }));
    tick();
    const t = setInterval(tick, everyMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // `parse` is a stable module-level function at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, url, active, everyMs]);
  return { ...state, configured: url !== "" };
}
