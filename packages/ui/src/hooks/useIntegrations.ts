import { useEffect, useState } from "react";
import { nextEvent, parseIcs, type CalEvent } from "../lib/ics";
import { parseWeather, weatherUrl, type Weather } from "../lib/weather";
import { messageOf, useDock } from "../store/dockStore";

type Feed<T> = { data: T | null; error: string | null; configured: boolean };

/** Fetches only when the user configured it AND the widget is visible. */
function useFeed<T>(
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

const parseNext = (text: string): CalEvent | null => nextEvent(parseIcs(text), new Date());
const parseW = (text: string): Weather | null => parseWeather(text);

export const useNextEvent = (active: boolean) =>
  useFeed(
    useDock((s) => s.config.integrations.calendarUrl),
    active,
    15 * 60_000,
    parseNext,
  );

export function useWeather(active: boolean) {
  const { weatherCity, weatherKey } = useDock((s) => s.config.integrations);
  const url = weatherCity && weatherKey ? weatherUrl(weatherCity, weatherKey) : "";
  return useFeed(url, active, 30 * 60_000, parseW);
}
