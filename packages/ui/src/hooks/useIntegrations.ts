import { nextEvent, parseIcs, type CalEvent } from "../lib/ics";
import { parseWeather, weatherUrl, type Weather } from "../lib/weather";
import { useDock } from "../store/dockStore";
import { useFeed } from "./useFeed";

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
