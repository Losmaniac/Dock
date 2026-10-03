import { useState } from "react";
import type { Workspace } from "@glass-dock/shared";
import { wsActionId } from "../lib/actions";
import { captureWorkspace } from "../lib/workspace";
import { messageOf, useDock } from "../store/dockStore";
import { Section } from "./controls";
import { AccelInput } from "./SettingsHotkeys";

const btn = "rounded-lg bg-white/15 px-2.5 py-1 text-xs hover:bg-white/25";

export function WorkspaceRows({ run }: { run: (actionId: string, target: string | null) => void }) {
  const platform = useDock((s) => s.platform)!;
  const workspaces = useDock((s) => s.config.workspaces);
  const edit = useDock((s) => s.edit);
  const report = useDock((s) => s.report);
  const [name, setName] = useState("");

  const save = async () => {
    const label = name.trim();
    if (!label) return report("Give the workspace a name first.");
    const ws = await captureWorkspace(label, crypto.randomUUID(), useDock.getState().windows, (h) =>
      platform.capturePlacement(h),
    ).catch((e) => {
      report(messageOf(e));
      return null;
    });
    if (!ws) return;
    if (ws.steps.length === 0) return report("No arrangeable windows are open.");
    edit((d) => void d.workspaces.push(ws));
    setName("");
  };

  const patch = (id: string, fn: (w: Workspace) => void) =>
    edit((d) => void fn(d.workspaces.find((w) => w.id === id)!));
  const hasMute = (w: Workspace) => w.steps.some((s) => s.type === "mute");

  return (
    <Section title="Workspaces and action chains">
      <div className="flex gap-2 py-1">
        <input
          aria-label="Workspace name"
          placeholder="Name, then save current layout"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg bg-white/15 px-2 py-1 text-sm outline-none"
        />
        <button className={btn} onClick={() => void save()}>
          Save layout
        </button>
      </div>
      {workspaces.map((w) => (
        <div key={w.id} className="mb-1 rounded-lg bg-white/10 p-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">
              {w.name} <span className="text-xs opacity-60">({w.steps.length} steps)</span>
            </span>
            <span className="flex gap-1">
              <button className={btn} onClick={() => run(wsActionId(w.id), null)}>
                Run
              </button>
              <button
                className={btn}
                onClick={() =>
                  edit((d) => void (d.workspaces = d.workspaces.filter((x) => x.id !== w.id)))
                }
              >
                Delete
              </button>
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={hasMute(w)}
                onChange={(e) =>
                  patch(w.id, (x) => {
                    x.steps = x.steps.filter((s) => s.type !== "mute");
                    if (e.target.checked) x.steps.unshift({ type: "mute", muted: true });
                  })
                }
              />
              Mute audio first
            </label>
            <AccelInput
              label={`Hotkey for ${w.name}`}
              value={w.hotkey ?? ""}
              onCommit={(v) =>
                patch(w.id, (x) => {
                  if (v) x.hotkey = v;
                  else delete x.hotkey;
                })
              }
            />
          </div>
        </div>
      ))}
    </Section>
  );
}
