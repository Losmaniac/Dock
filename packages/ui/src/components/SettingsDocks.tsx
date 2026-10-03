import { newDock } from "@glass-dock/shared";
import { Trash2 } from "lucide-react";
import { docksForMissingMonitors } from "../lib/docks";
import { useCurrentDock, useDock } from "../store/dockStore";
import { Section } from "./controls";
import { Note } from "../widgets/ui";

const btn = "rounded-lg bg-white/15 px-2.5 py-1 text-xs hover:bg-white/25";
const OPPOSITE = { bottom: "top", top: "bottom", left: "right", right: "left" } as const;

/** Add, rename and remove docks. Settings elsewhere in this panel edit the dock you opened it from. */
export function DockRows() {
  const docks = useDock((s) => s.config.docks);
  const monitors = useDock((s) => s.monitors);
  const edit = useDock((s) => s.edit);
  const current = useCurrentDock();

  const monitorLabel = (id: string) =>
    id === "primary"
      ? "Primary monitor"
      : `Monitor ${monitors.findIndex((m) => m.id === id) + 1 || "?"}`;

  return (
    <Section title="Docks">
      <ul className="space-y-1.5">
        {docks.map((d, i) => (
          <li
            key={d.id}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1.5 text-sm"
          >
            <input
              aria-label={`Name of dock ${i + 1}`}
              defaultValue={d.name}
              onBlur={(e) =>
                edit(
                  (c) =>
                    void (c.docks.find((x) => x.id === d.id)!.name =
                      e.target.value.trim() || "Dock"),
                )
              }
              className="min-w-0 flex-1 rounded bg-transparent px-1 outline-none focus:bg-white/15"
            />
            <span className="shrink-0 text-xs opacity-60">
              {monitorLabel(d.monitor)} · {d.position}
              {d.id === current.id ? " · editing" : ""}
            </span>
            {docks.length > 1 && (
              <button
                aria-label={`Remove ${d.name}`}
                className="rounded p-1 hover:bg-white/15"
                onClick={() => edit((c) => void (c.docks = c.docks.filter((x) => x.id !== d.id)))}
              >
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          className={btn}
          onClick={() =>
            edit((c) => {
              c.docks.push(
                newDock({
                  name: `Dock ${c.docks.length + 1}`,
                  monitor: current.monitor,
                  position: OPPOSITE[current.position],
                  iconSize: current.iconSize,
                }),
              );
            })
          }
        >
          Add dock
        </button>
        {monitors.length > 1 && (
          <button
            className={btn}
            onClick={() =>
              edit((c) => void c.docks.push(...docksForMissingMonitors(c, monitors, current)))
            }
          >
            Add a dock on every other monitor
          </button>
        )}
      </div>
      <Note>
        Each dock has its own items, position and monitor. Widgets and apps can live in any dock;
        use the Widgets list below while editing the dock you want.
      </Note>
    </Section>
  );
}
