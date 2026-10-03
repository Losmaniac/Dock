import { useFeed } from "../hooks/useFeed";
import { convert, ECB_URL, fixed, parseEcb, type Rates } from "../lib/markets";
import { useOption } from "./hooks";
import { MIN } from "./marketsShared";
import type { FaceProps, PanelProps } from "./types";
import { Big, Note, Small, Stack } from "./ui";

// ---- Currency (European Central Bank daily reference rates)
const useRates = (active: boolean) => useFeed<Rates>(ECB_URL, active, 6 * 60 * MIN, parseEcb);

export function CurrencyFace({ item, active }: FaceProps) {
  const { data, error } = useRates(active);
  const [from] = useOption(item, "from", "EUR");
  const [to] = useOption(item, "to", "USD");
  if (error) return <span className="text-[10px] text-red-300">Offline</span>;
  const v = data ? convert(1, from, to, data) : null;
  return (
    <Stack>
      <Big>{v === null ? "…" : fixed(v, v < 10 ? 3 : 2)}</Big>
      <Small>
        {from}→{to}
      </Small>
    </Stack>
  );
}

export function CurrencyPanel({ item }: PanelProps) {
  const { data, error } = useRates(true);
  const [from, setFrom] = useOption(item, "from", "EUR");
  const [to, setTo] = useOption(item, "to", "USD");
  const [amount, setAmount] = useOption(item, "amount", "100");
  const codes = Object.keys(data?.perEur ?? { EUR: 1 }).sort();
  const n = Number(amount.replace(",", "."));
  const out = data && Number.isFinite(n) ? convert(n, from, to, data) : null;
  const sel = "rounded-lg bg-white/15 px-2 py-1 outline-none";
  const opt = (c: string) => (
    <option key={c} value={c} className="text-black">
      {c}
    </option>
  );
  return (
    <div className="space-y-2 text-sm">
      {error && <p className="text-red-400">{error}</p>}
      <input
        aria-label="Amount"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className={`w-full ${sel}`}
      />
      <div className="flex gap-2">
        <select
          aria-label="From"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={sel}
        >
          {codes.map(opt)}
        </select>
        <span>→</span>
        <select aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className={sel}>
          {codes.map(opt)}
        </select>
      </div>
      <div className="text-xl font-semibold tabular-nums">
        {out === null ? "–" : `${fixed(out)} ${to}`}
      </div>
      <Note>
        European Central Bank reference rates{data?.date ? ` of ${data.date}` : ""}, published on
        working days. Not for trading.
      </Note>
    </div>
  );
}
