import { z } from "zod";

export const CONFIG_VERSION = 2;

export const WIDGET_KINDS = [
  "clock",
  "date",
  "stopwatch",
  "pomodoro",
  "countdown",
  "world-clock",
  "calculator",
  "todo",
  "note",
  "system-stats",
  "battery",
  "uptime",
  "storage",
  "network",
  "temperature",
  "volume",
  "now-playing",
  "turntable",
  "virtual-desktops",
  "language",
  "calendar",
  "weather",
  "stocks",
  "crypto",
  "currency",
  "market",
  "ai-providers",
] as const;
export type WidgetKind = (typeof WIDGET_KINDS)[number];

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const dockItemSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("app"),
    label: z.string(),
    path: z.string().min(1),
    args: z.array(z.string()).default([]),
    /** Store apps: launched and matched by AppUserModelID instead of a path. */
    aumid: z.string().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("folder"),
    label: z.string(),
    path: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("url"),
    label: z.string(),
    url: z.string().url(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("widget"),
    widget: z.enum(WIDGET_KINDS),
    size: z.enum(["compact", "wide"]).default("compact"),
    /** Per-widget settings and small saved state (timers, notes, todo list) as strings. */
    options: z.record(z.string(), z.string()).default({}),
  }),
  z.object({ id: z.string().min(1), type: z.literal("separator") }),
]);

const launchTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("app"),
    path: z.string().min(1),
    args: z.array(z.string()).default([]),
  }),
  z.object({ type: z.literal("uwp"), aumid: z.string().min(1) }),
  z.object({ type: z.literal("folder"), path: z.string().min(1) }),
  z.object({ type: z.literal("file"), path: z.string().min(1) }),
  z.object({ type: z.literal("url"), url: z.string().url() }),
]);

/** Which window a step acts on: by executable path or Store-app id. */
const matchSchema = z
  .object({ path: z.string().optional(), aumid: z.string().optional() })
  .refine((m) => !!m.path || !!m.aumid, "match needs a path or an aumid");

const placementSchema = z.object({
  monitorId: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  maximized: z.boolean().default(false),
});

/** A workspace is also an action chain: ordered steps, optionally bound to a hotkey. */
export const workspaceStepSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("launch"), target: launchTargetSchema }),
  z.object({ type: z.literal("place"), match: matchSchema, placement: placementSchema }),
  z.object({ type: z.literal("snap"), match: matchSchema, layout: z.string() }),
  z.object({ type: z.literal("mute"), muted: z.boolean() }),
  z.object({ type: z.literal("wait"), ms: z.number().min(0).max(10_000) }),
]);

export const workspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hotkey: z.string().optional(),
  steps: z.array(workspaceStepSchema).default([]),
});

export const dockDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().default("Dock"),
  /** "primary" or a monitor id from the platform; an unplugged monitor falls back to primary. */
  monitor: z.string().default("primary"),
  position: z.enum(["bottom", "top", "left", "right"]).default("bottom"),
  autoHide: z.boolean().default(false),
  autoHideDelay: z.number().min(0).max(2000).default(150),
  reserveSpace: z.boolean().default(false),
  iconSize: z.number().min(32).max(96).default(56),
  magnification: z.number().min(1).max(1.8).default(1.6),
  items: z.array(dockItemSchema).default([]),
});
export type DockDef = z.infer<typeof dockDefSchema>;

export const newId = (): string => globalThis.crypto.randomUUID();

export function newDock(over: Partial<DockDef> = {}): DockDef {
  return dockDefSchema.parse({ id: newId(), ...over });
}

export const dockConfigSchema = z.object({
  version: z.literal(CONFIG_VERSION),
  /** One entry per dock window. The first dock is the main window; others get their own. */
  docks: z
    .array(dockDefSchema)
    .min(1)
    .default(() => [newDock()]),
  system: z
    .object({
      /** Hide the native Windows taskbar. A guard process restores it if the dock crashes. */
      hideTaskbar: z.boolean().default(false),
      /** The welcome panel was shown and dismissed. Existing (migrated) users never see it. */
      onboarded: z.boolean().default(false),
    })
    .default({}),
  appearance: z
    .object({
      theme: z.enum(["system", "light", "dark"]).default("system"),
      /** Id of the chosen look from the theme gallery (see ui/lib/themes.ts). */
      themeId: z.string().default("auto"),
      finish: z.enum(["glass", "frosted", "clear"]).default("glass"),
      /** Take the accent (and, for the Wallpaper theme, the tint) from the desktop wallpaper. */
      accentFromWallpaper: z.boolean().default(false),
      blurMode: z.enum(["mica", "acrylic", "blur", "none"]).default("mica"),
      blurStrength: z.number().min(0).max(64).default(24),
      tint: hexColor.default("#ffffff"),
      tintOpacity: z.number().min(0).max(1).default(0.12),
      radius: z.number().min(0).max(40).default(22),
      accent: hexColor.default("#4f8cff"),
      /** "Solid" fallback: no transparency (low-end GPUs, accessibility). */
      solid: z.boolean().default(false),
    })
    .default({}),
  /** Opt-in network features. Nothing is fetched while these are empty. */
  integrations: z
    .object({
      /** Read-only ICS feed (https). */
      calendarUrl: z.string().default(""),
      weatherCity: z.string().default(""),
      /** OpenWeatherMap key. Stored in the local config file in plain text. */
      weatherKey: z.string().default(""),
    })
    .default({}),
  hotkeys: z
    .object({
      toggleDock: z.string().default("Ctrl+Alt+D"),
      commandPalette: z.string().default("Ctrl+Space"),
      /** Modifier for "jump to the Nth dock item": <modifier>+1 .. <modifier>+9. Empty = off. */
      jumpModifier: z.string().default("Ctrl+Alt"),
      /** Window switcher overlay. Alt+Tab itself cannot be taken over by a global hotkey. */
      switcher: z.string().default("Ctrl+Alt+W"),
      /** Moves keyboard focus into the dock so it can be used without a mouse. */
      focusDock: z.string().default("Ctrl+Alt+Home"),
      /** Opens the launcher (all apps, recent files, document search). */
      launcher: z.string().default("Ctrl+Alt+Space"),
      /** Snap layout -> accelerator, for example `{ "left-half": "Ctrl+Alt+Left" }`. */
      snap: z.record(z.string()).default({}),
    })
    .default({}),
  workspaces: z.array(workspaceSchema).default([]),
});

export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceStep = z.infer<typeof workspaceStepSchema>;
export type WindowMatch = z.infer<typeof matchSchema>;
export type DockItem = z.infer<typeof dockItemSchema>;
export type DockConfig = z.infer<typeof dockConfigSchema>;

export function defaultConfig(): DockConfig {
  return dockConfigSchema.parse({ version: CONFIG_VERSION });
}

/**
 * Upgrade a raw config of any older version to the current one. One step per schema change.
 *  v1 -> v2: `dock` + `items` became `docks[0]`; `dock.hideTaskbar` moved to `system`.
 */
export function migrateConfig(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return raw;
  const {
    dock = {},
    items = [],
    ...rest
  } = r as { dock?: Record<string, unknown>; items?: unknown[] } & Record<string, unknown>;
  const { hideTaskbar, ...withLegacy } = dock as Record<string, unknown>;
  const dockFields = Object.fromEntries(
    Object.entries(withLegacy).filter(([k]) => k !== "monitors"),
  );
  return {
    ...rest,
    version: 2,
    docks: [{ id: newId(), name: "Main dock", ...dockFields, items }],
    system: { hideTaskbar: hideTaskbar === true, onboarded: true },
  };
}

export type ParseConfigResult =
  { ok: true; config: DockConfig } | { ok: false; config: DockConfig; error: string };

/**
 * Validate a raw config. On failure returns defaults plus the error so the caller can
 * back up the bad file (never delete it) before falling back.
 */
export function parseConfig(raw: unknown): ParseConfigResult {
  const result = dockConfigSchema.safeParse(migrateConfig(raw));
  if (result.success) return { ok: true, config: result.data };
  return { ok: false, config: defaultConfig(), error: result.error.message };
}
