import { describe, expect, it } from "vitest";
import { parseWeather, weatherUrl } from "./weather";

describe("weather", () => {
  it("builds an encoded https URL", () => {
    const u = weatherUrl(" New York ", "a b");
    expect(u).toBe(
      "https://api.openweathermap.org/data/2.5/weather?q=New%20York&units=metric&appid=a%20b",
    );
  });
  it("parses a response and rejects junk", () => {
    expect(
      parseWeather(
        JSON.stringify({ name: "Prague", main: { temp: 3.2 }, weather: [{ description: "snow" }] }),
      ),
    ).toEqual({ city: "Prague", tempC: 3.2, description: "snow" });
    expect(parseWeather("{}")).toBeNull();
    expect(parseWeather("nope")).toBeNull();
  });
});
