export interface Weather {
  city: string;
  tempC: number;
  description: string;
}

/** OpenWeatherMap current weather. The key is user supplied; nothing is sent without it. */
export const weatherUrl = (city: string, key: string): string =>
  `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city.trim())}&units=metric&appid=${encodeURIComponent(key.trim())}`;

export function parseWeather(json: string): Weather | null {
  try {
    const d = JSON.parse(json) as {
      name?: string;
      main?: { temp?: number };
      weather?: { description?: string }[];
    };
    if (typeof d.main?.temp !== "number") return null;
    return {
      city: d.name ?? "",
      tempC: d.main.temp,
      description: d.weather?.[0]?.description ?? "",
    };
  } catch {
    return null;
  }
}
