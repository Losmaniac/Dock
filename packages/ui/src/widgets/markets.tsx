import { useFeed } from "../hooks/useFeed";
import { cleanSymbols, fixed, parseStooq, signed, stooqUrl } from "../lib/markets";
import { useOption } from "./hooks";
import { MIN, OFFLINE_NOTE, tone } from "./marketsShared";
import { SymbolsField } from "./SymbolsField";
import type { FaceProps, PanelProps, WidgetItem } from "./types";
import { Big, Note, Small, Stack } from "./ui";

// ---- Stocks and indices (Stooq)
const STOCKS = "aapl.us,msft.us,nvda.us";
const INDICES = "^spx,^dji,^ndq,^dax";

function useQuotes(item: WidgetItem, key: string, fallback: string, active: boolean) {
  const [raw] = useOption(item, key, fallback);
  const symbols = cleanSymbols(raw);
  return useFeed(symbols.length ? stooqUrl(symbols) : "", active, 5 * MIN, parseStooq);
}

function QuoteFace({
  item,
  active,
  wide,
  optionKey,
  fallback,
}: FaceProps & { optionKey: string; fallback: string }) {
  const { data, error, configured } = useQuotes(item, optionKey, fallback, active);
  if (!configured) return <Small>Add symbols</Small>;
  if (error) return <span className="text-[10px] text-red-300">Offline</span>;
  if (!data?.length) return <Small>…</Small>;
  return (
    <span className="flex gap-3 px-1">
      {data.slice(0, wide ? 2 : 1).map((q) => (
        <Stack key={q.symbol}>
          <Big>{fixed(q.price, q.price >= 1000 ? 0 : 2)}</Big>
          <span className={`text-[10px] ${tone(q.changePct)}`}>{signed(q.changePct)}</span>
          <Small>{q.symbol.replace(".US", "")}</Small>
        </Stack>
      ))}
    </span>
  );
}

function QuotePanel({
  item,
  optionKey,
  fallback,
  hint,
}: PanelProps & { optionKey: string; fallback: string; hint: string }) {
  const { data, error } = useQuotes(item, optionKey, fallback, true);
  return (
    <div className="space-y-2 text-sm">
      {error && <p className="text-red-400">{error}</p>}
      <ul>
        {(data ?? []).map((q) => (
          <li key={q.symbol} className="flex justify-between">
            <span>{q.symbol}</span>
            <span className="tabular-nums">
              {fixed(q.price)} <span className={tone(q.changePct)}>{signed(q.changePct)}</span>
            </span>
          </li>
        ))}
      </ul>
      <SymbolsField item={item} optionKey={optionKey} fallback={fallback} label="Symbols" />
      <Note>
        {hint} Change is since today's open. {OFFLINE_NOTE}
      </Note>
    </div>
  );
}

export const StocksFace = (p: FaceProps) => (
  <QuoteFace {...p} optionKey="symbols" fallback={STOCKS} />
);
export const StocksPanel = (p: PanelProps) => (
  <QuotePanel
    {...p}
    optionKey="symbols"
    fallback={STOCKS}
    hint="Symbols are Stooq codes such as aapl.us, comma separated."
  />
);
export const MarketFace = (p: FaceProps) => (
  <QuoteFace {...p} optionKey="symbols" fallback={INDICES} />
);
export const MarketPanel = (p: PanelProps) => (
  <QuotePanel
    {...p}
    optionKey="symbols"
    fallback={INDICES}
    hint="Index codes: ^spx, ^dji, ^ndq, ^dax."
  />
);
