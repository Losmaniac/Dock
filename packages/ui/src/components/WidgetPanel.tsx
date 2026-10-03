import { X } from "lucide-react";
import { findItem } from "../lib/docks";
import { useDock } from "../store/dockStore";
import { WIDGETS } from "../widgets/registry";

const FALLBACK = { w: 300, h: 220 };

export const widgetPanelSize = (kind: keyof typeof WIDGETS) => WIDGETS[kind].panel ?? FALLBACK;

/** Frame around a widget's own panel. The widget is looked up live so edits show immediately. */
export function WidgetPanel({ itemId, close }: { itemId: string; close: () => void }) {
  const item = useDock((s) => findItem(s.config, itemId));
  if (item?.type !== "widget") return null;
  const def = WIDGETS[item.widget];
  const size = def.panel ?? FALLBACK;
  const Panel = def.Panel;
  return (
    <div className="panel flex flex-col p-4 text-sm" style={{ width: size.w, height: size.h }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{def.label}</h2>
        <button aria-label="Close" onClick={close} className="rounded-lg p-1 hover:bg-white/15">
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {Panel && <Panel item={item} close={close} />}
      </div>
    </div>
  );
}
