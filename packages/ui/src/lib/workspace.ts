import type {
  LaunchItem,
  Placement,
  SnapLayout,
  WindowInfo,
  Workspace,
  WorkspaceStep,
} from "@glass-dock/shared";
import { windowKey } from "./entries";

export interface RunnerDeps {
  launch(item: LaunchItem): Promise<void>;
  listWindows(): Promise<WindowInfo[]>;
  snap(hwnd: string, layout: SnapLayout): Promise<void>;
  place(hwnd: string, placement: Placement): Promise<void>;
  setMuted(muted: boolean): Promise<void>;
  sleep(ms: number): Promise<void>;
  now(): number;
}

type Match = { path?: string | undefined; aumid?: string | undefined };

export const matchKey = (m: Match): string =>
  m.aumid ? `aumid:${m.aumid.toLowerCase()}` : `path:${(m.path ?? "").toLowerCase()}`;

const targetMatch = (t: Extract<WorkspaceStep, { type: "launch" }>["target"]): Match | null =>
  t.type === "app" ? { path: t.path } : t.type === "uwp" ? { aumid: t.aumid } : null;

export interface RunResult {
  done: number;
  failures: string[];
}

/**
 * Runs the steps in order. A failing step is recorded and the chain continues, so one app that
 * cannot start does not leave the rest of the workspace unarranged.
 */
export async function runWorkspace(
  ws: Workspace,
  deps: RunnerDeps,
  opts: { timeoutMs?: number; pollMs?: number } = {},
): Promise<RunResult> {
  const timeout = opts.timeoutMs ?? 10_000;
  const poll = opts.pollMs ?? 250;
  const failures: string[] = [];
  let done = 0;

  const waitFor = async (m: Match): Promise<WindowInfo | null> => {
    const key = matchKey(m);
    const t0 = deps.now();
    for (;;) {
      const w = (await deps.listWindows()).find((x) => windowKey(x) === key);
      if (w) return w;
      if (deps.now() - t0 >= timeout) return null;
      await deps.sleep(poll);
    }
  };

  for (const [i, step] of ws.steps.entries()) {
    const label = `step ${i + 1} (${step.type})`;
    try {
      switch (step.type) {
        case "launch": {
          const m = targetMatch(step.target);
          // Do not open a second copy of an app that is already running.
          const running = m && (await deps.listWindows()).some((w) => windowKey(w) === matchKey(m));
          if (!running) await deps.launch(step.target as LaunchItem);
          break;
        }
        case "place":
        case "snap": {
          const w = await waitFor(step.match);
          if (!w) throw new Error("window did not appear");
          if (step.type === "place") await deps.place(w.hwnd, step.placement);
          else await deps.snap(w.hwnd, step.layout as SnapLayout);
          break;
        }
        case "mute":
          await deps.setMuted(step.muted);
          break;
        case "wait":
          await deps.sleep(step.ms);
          break;
      }
      done++;
    } catch (e) {
      failures.push(
        `${label}: ${e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e)}`,
      );
    }
  }
  return { done, failures };
}

/** Snapshot the current arrangement: one launch + one place step per distinct running app. */
export async function captureWorkspace(
  name: string,
  id: string,
  windows: WindowInfo[],
  capture: (hwnd: string) => Promise<Placement | null>,
): Promise<Workspace> {
  const seen = new Set<string>();
  const steps: WorkspaceStep[] = [];
  for (const w of windows) {
    const key = windowKey(w);
    if (seen.has(key) || w.minimized || w.elevated) continue;
    const placement = await capture(w.hwnd);
    if (!placement) continue;
    seen.add(key);
    const match = w.aumid ? { aumid: w.aumid } : { path: w.processPath };
    steps.push(
      {
        type: "launch",
        target: w.aumid
          ? { type: "uwp", aumid: w.aumid }
          : { type: "app", path: w.processPath, args: [] },
      },
      { type: "place", match, placement },
    );
  }
  return { id, name, steps };
}
