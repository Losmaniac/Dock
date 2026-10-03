import { useNextEvent, useWeather } from "../hooks/useIntegrations";
import type { FaceProps } from "./types";
import { Big, Small, Stack } from "./ui";

const hhmm = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});
const day = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

export function CalendarFace({ active }: FaceProps) {
  const { data, configured, error } = useNextEvent(active);
  if (!configured) return <Small>Set ICS URL</Small>;
  if (error) return <span className="text-[10px] text-red-300">Error</span>;
  if (!data) return <Small>No events</Small>;
  return (
    <Stack>
      <Big>{data.allDay ? day.format(data.start) : hhmm.format(data.start)}</Big>
      <Small>{data.title}</Small>
    </Stack>
  );
}

export function CalendarPanel() {
  const { data, configured, error } = useNextEvent(true);
  if (!configured)
    return (
      <p className="opacity-60">
        Add a read-only ICS link in Settings to enable this widget. Recurring events are not
        expanded.
      </p>
    );
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="opacity-60">No upcoming events.</p>;
  return (
    <div>
      <div className="text-base font-semibold">{data.title}</div>
      <div className="opacity-70">
        {new Intl.DateTimeFormat(
          undefined,
          data.allDay ? { dateStyle: "full" } : { dateStyle: "full", timeStyle: "short" },
        ).format(data.start)}
      </div>
    </div>
  );
}

export function WeatherFace({ active }: FaceProps) {
  const { data, configured, error } = useWeather(active);
  if (!configured) return <Small>Set city + key</Small>;
  if (error) return <span className="text-[10px] text-red-300">Error</span>;
  if (!data) return <Small>…</Small>;
  return (
    <Stack>
      <Big>{Math.round(data.tempC)}°C</Big>
      <Small>{data.description}</Small>
    </Stack>
  );
}

export function WeatherPanel() {
  const { data, configured, error } = useWeather(true);
  if (!configured)
    return (
      <p className="opacity-60">
        Enter a city and an OpenWeatherMap key in Settings. The request is only sent once both are
        set.
      </p>
    );
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="opacity-60">Loading…</p>;
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">
        {data.tempC.toFixed(1).replace(".", ",")} °C
      </div>
      <div className="opacity-70">
        {data.city}, {data.description}
      </div>
    </div>
  );
}
