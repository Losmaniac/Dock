import { X } from "lucide-react";
import type { Entry } from "../lib/entries";

export const PROPS_SIZE = { w: 380, h: 200 };

export function PropertiesPanel({
  entry,
  close,
}: {
  entry: Extract<Entry, { kind: "app" | "running" }>;
  close: () => void;
}) {
  const label = entry.kind === "app" ? entry.item.label : entry.label;
  const path = entry.kind === "app" ? entry.item.path : entry.path;
  return (
    <div className="panel p-4 text-sm" style={{ width: PROPS_SIZE.w, height: PROPS_SIZE.h }}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{label}</h2>
        <button
          aria-label="Close properties"
          onClick={close}
          className="rounded-lg p-1 hover:bg-white/15"
        >
          <X size={16} />
        </button>
      </div>
      <dl className="space-y-1 text-xs">
        <dt className="opacity-60">Path</dt>
        <dd className="break-all">{path}</dd>
        <dt className="pt-1 opacity-60">Windows ({entry.windows.length})</dt>
        <dd className="max-h-20 overflow-y-auto">
          {entry.windows.map((w) => (
            <div key={w.hwnd} className="truncate">
              {w.title}
              {w.elevated ? " (administrator)" : ""}
            </div>
          ))}
        </dd>
      </dl>
    </div>
  );
}
