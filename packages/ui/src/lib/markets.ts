/**
 * Parsers for the opt-in market widgets. Sources (all public, no key, https only):
 *  - Stooq quotes CSV   https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv
 *  - CoinGecko prices   https://api.coingecko.com/api/v3/simple/price
 *  - ECB daily rates    https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
 * Nothing is requested unless the matching widget is on the dock and visible.
 */

export interface Quote {
  symbol: string;
  price: number;
  /** Change since the day's open, in percent (Stooq gives no previous close). */
  changePct: number;
}

const SYMBOL = /^\^?[a-z0-9.-]{1,12}$/i;

export const cleanSymbols = (raw: string, max = 6): string[] =>
  raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => SYMBOL.test(s))
    .slice(0, max);

export const stooqUrl = (symbols: string[]): string =>
  `https://stooq.com/q/l/?s=${symbols.map(encodeURIComponent).join("+")}&f=sd2t2ohlcv&h&e=csv`;

export function parseStooq(csv: string): Quote[] {
  const out: Quote[] = [];
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const c = line.split(",");
    const [symbol, , , open, , , close] = c;
    const o = Number(open),
      p = Number(close);
    if (!symbol || !Number.isFinite(p) || close === "N/D") continue;
    out.push({
      symbol: symbol.toUpperCase(),
      price: p,
      changePct: Number.isFinite(o) && o > 0 ? ((p - o) / o) * 100 : 0,
    });
  }
  return out;
}

export interface Coin {
  id: string;
  price: number;
  change24h: number;
}

export const cleanCoins = (raw: string, max = 6): string[] =>
  raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9-]{1,40}$/.test(s))
    .slice(0, max);

export const coinUrl = (ids: string[], vs: string): string =>
  `https://api.coingecko.com/api/v3/simple/price?ids=${ids.map(encodeURIComponent).join(",")}&vs_currencies=${encodeURIComponent(vs)}&include_24hr_change=true`;

export function parseCoins(json: string, vs: string): Coin[] {
  try {
    const d = JSON.parse(json) as Record<string, Record<string, number>>;
    return Object.entries(d)
      .filter(([, v]) => typeof v?.[vs] === "number")
      .map(([id, v]) => ({ id, price: v[vs]!, change24h: v[`${vs}_24h_change`] ?? 0 }));
  } catch {
    return [];
  }
}

export const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

export interface Rates {
  date: string;
  /** Units of each currency per 1 EUR. EUR itself is 1. */
  perEur: Record<string, number>;
}

export function parseEcb(xml: string): Rates | null {
  const perEur: Record<string, number> = { EUR: 1 };
  for (const m of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g))
    perEur[m[1]!] = Number(m[2]);
  const date = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1] ?? "";
  return Object.keys(perEur).length > 1 ? { date, perEur } : null;
}

export function convert(amount: number, from: string, to: string, r: Rates): number | null {
  const a = r.perEur[from],
    b = r.perEur[to];
  return a && b ? (amount / a) * b : null;
}

/** `1 234,56`: space as thousands separator, comma as decimal mark. */
export function fixed(n: number, digits = 2): string {
  const [int = "", frac] = Math.abs(n).toFixed(digits).split(".");
  return `${n < 0 ? "-" : ""}${int.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${frac ? "," + frac : ""}`;
}

export const signed = (pct: number): string => `${pct >= 0 ? "+" : "−"}${fixed(Math.abs(pct))} %`;
