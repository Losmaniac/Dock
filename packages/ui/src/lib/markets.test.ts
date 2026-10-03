import { describe, expect, it } from "vitest";
import {
  cleanCoins,
  cleanSymbols,
  coinUrl,
  convert,
  fixed,
  parseCoins,
  parseEcb,
  parseStooq,
  signed,
  stooqUrl,
} from "./markets";

describe("stooq", () => {
  const csv =
    "Symbol,Date,Time,Open,High,Low,Close,Volume\nAAPL.US,2030-01-02,22:00:00,100,110,99,110,12345\nBAD.US,N/D,N/D,N/D,N/D,N/D,N/D,N/D\n^SPX,2030-01-02,22:00:00,200,201,190,190,0\n";
  it("parses quotes, computes the day change and skips unknown symbols", () => {
    const q = parseStooq(csv);
    expect(q.map((x) => x.symbol)).toEqual(["AAPL.US", "^SPX"]);
    expect(q[0]!.changePct).toBeCloseTo(10);
    expect(q[1]!.changePct).toBeCloseTo(-5);
  });
  it("sanitizes symbols before they reach a URL", () => {
    expect(cleanSymbols("AAPL.US, msft.us ,bad symbol,^dji,x&y=1")).toEqual([
      "aapl.us",
      "msft.us",
      "^dji",
    ]);
    expect(stooqUrl(["aapl.us", "^dji"])).toBe(
      "https://stooq.com/q/l/?s=aapl.us+%5Edji&f=sd2t2ohlcv&h&e=csv",
    );
  });
});

describe("coingecko", () => {
  it("parses prices with 24 h change and tolerates junk", () => {
    const j = JSON.stringify({
      bitcoin: { usd: 65000.5, usd_24h_change: -1.25 },
      ethereum: { usd: 3000 },
      nope: { eur: 1 },
    });
    const c = parseCoins(j, "usd");
    expect(c).toEqual([
      { id: "bitcoin", price: 65000.5, change24h: -1.25 },
      { id: "ethereum", price: 3000, change24h: 0 },
    ]);
    expect(parseCoins("<html>", "usd")).toEqual([]);
  });
  it("sanitizes coin ids and builds the URL", () => {
    expect(cleanCoins("Bitcoin, ethereum, bad id!, a/b")).toEqual(["bitcoin", "ethereum"]);
    expect(coinUrl(["bitcoin"], "usd")).toContain(
      "ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
    );
  });
});

describe("ECB rates", () => {
  const xml = `<gesmes:Envelope><Cube><Cube time='2030-01-02'><Cube currency='USD' rate='1.10'/><Cube currency='CZK' rate="25.00"/><Cube currency='JPY' rate='160'/></Cube></Cube></gesmes:Envelope>`;
  it("parses the date and rates", () => {
    const r = parseEcb(xml)!;
    expect(r.date).toBe("2030-01-02");
    expect(r.perEur).toEqual({ EUR: 1, USD: 1.1, CZK: 25, JPY: 160 });
    expect(parseEcb("<html/>")).toBeNull();
  });
  it("converts through EUR in both directions", () => {
    const r = parseEcb(xml)!;
    expect(convert(10, "EUR", "USD", r)).toBeCloseTo(11);
    expect(convert(11, "USD", "EUR", r)).toBeCloseTo(10);
    expect(convert(110, "USD", "CZK", r)).toBeCloseTo(2500);
    expect(convert(1, "EUR", "XXX", r)).toBeNull();
  });
});

describe("number formatting", () => {
  it("uses a space and a decimal comma", () => {
    expect(fixed(1234567.891)).toBe("1 234 567,89");
    expect(fixed(-0.5)).toBe("-0,50");
    expect(signed(2.345)).toBe("+2,35 %");
    expect(signed(-1)).toBe("−1,00 %");
  });
});
