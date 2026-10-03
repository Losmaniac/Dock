import { useCallback } from "react";
import { findItem } from "../lib/docks";
import { useDock } from "../store/dockStore";
import type { WidgetItem } from "./types";

/** A string option stored on the widget item in the config (persisted, debounced). */
export function useOption(
  item: WidgetItem,
  key: string,
  fallback = "",
): [string, (v: string) => void] {
  const live = useDock((s) => findItem(s.config, item.id));
  const value = live?.type === "widget" ? (live.options[key] ?? fallback) : fallback;
  const set = useCallback(
    (v: string) =>
      useDock.getState().edit((d) => {
        const it = findItem(d, item.id);
        if (it?.type === "widget") it.options[key] = v;
      }),
    [item.id, key],
  );
  return [value, set];
}

/** JSON state kept in an option; `parse` must tolerate corrupt or missing data. */
export function useJsonOption<T>(
  item: WidgetItem,
  key: string,
  parse: (raw: string | undefined) => T,
): [T, (next: T) => void] {
  const [raw, setRaw] = useOption(item, key, "");
  return [parse(raw || undefined), (next) => setRaw(JSON.stringify(next))];
}

export function parseJson<T>(raw: string | undefined, fallback: T): T {
  try {
    return raw ? ({ ...fallback, ...(JSON.parse(raw) as object) } as T) : fallback;
  } catch {
    return fallback;
  }
}
