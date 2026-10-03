import type { WidgetItem } from "./types";
import { useOption } from "./hooks";

export function SymbolsField({
  item,
  optionKey,
  fallback,
  label,
}: {
  item: WidgetItem;
  optionKey: string;
  fallback: string;
  label: string;
}) {
  const [v, set] = useOption(item, optionKey, fallback);
  return (
    <input
      aria-label={label}
      defaultValue={v}
      onBlur={(e) => set(e.target.value)}
      className="w-full rounded-lg bg-white/15 px-2 py-1 text-xs outline-none"
    />
  );
}
