import { useFeed } from "../hooks/useFeed";
import { cleanCoins, coinUrl, fixed, parseCoins, signed } from "../lib/markets";
import { useOption } from "./hooks";
import { MIN, OFFLINE_NOTE, tone } from "./marketsShared";
import { SymbolsField } from "./SymbolsField";
import type { FaceProps, PanelProps, WidgetItem } from "./types";
import { Big, Note, Small, Stack } from "./ui";

// ---- Crypto (CoinGecko)
const COINS = "bitcoin,ethereum,solana";
const SHORT: Record<string, string> = { bitcoin: "BTC", ethereum: "ETH", solana: "SOL" };

function useCoins(item: WidgetItem, active: boolean) {
  const [raw] = useOption(item, "coins", COINS);
  const [vs] = useOption(item, "vs", "usd");
  const ids = cleanCoins(raw);
  const cur = /^[a-z]{3,4}$/.test(vs) ? vs : "usd";
  return {
    ...useFeed(ids.length ? coinUrl(ids, cur) : "", active, 2 * MIN, (t) => parseCoins(t, cur)),
    cur,
  };
}

export function CryptoFace({ item, active, wide }: FaceProps) {
  const { data, error, configured } = useCoins(item, active);
  if (!configured) return <Small>Add coins</Small>;
  if (error) return <span className="text-[10px] text-red-300">Offline</span>;
  if (!data?.length) return <Small>…</Small>;
  return (
    <span className="flex gap-3 px-1">
      {data.slice(0, wide ? 2 : 1).map((c) => (
        <Stack key={c.id}>
          <Big>{fixed(c.price, c.price >= 100 ? 0 : 2)}</Big>
          <span className={`text-[10px] ${tone(c.change24h)}`}>{signed(c.change24h)}</span>
          <Small>{SHORT[c.id] ?? c.id}</Small>
        </Stack>
      ))}
    </span>
  );
}

export function CryptoPanel({ item }: PanelProps) {
  const { data, error, cur } = useCoins(item, true);
  return (
    <div className="space-y-2 text-sm">
      {error && <p className="text-red-400">{error}</p>}
      <ul>
        {(data ?? []).map((c) => (
          <li key={c.id} className="flex justify-between">
            <span>{SHORT[c.id] ?? c.id}</span>
            <span className="tabular-nums">
              {fixed(c.price)} {cur.toUpperCase()}{" "}
              <span className={tone(c.change24h)}>{signed(c.change24h)}</span>
            </span>
          </li>
        ))}
      </ul>
      <SymbolsField item={item} optionKey="coins" fallback={COINS} label="Coins" />
      <Note>CoinGecko ids such as bitcoin, ethereum, solana (24 h change). {OFFLINE_NOTE}</Note>
    </div>
  );
}
