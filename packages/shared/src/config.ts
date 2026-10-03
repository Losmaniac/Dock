import { z } from "zod";

export const CONFIG_VERSION = 1;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const dockItemSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("app"),
    label: z.string(),
    path: z.string().min(1),
    args: z.array(z.string()).default([]),
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
    widget: z.enum(["clock", "system-stats", "battery", "now-playing"]),
  }),
  z.object({ id: z.string().min(1), type: z.literal("separator") }),
]);

export const dockConfigSchema = z.object({
  version: z.literal(CONFIG_VERSION),
  dock: z
    .object({
      position: z.enum(["bottom", "top", "left", "right"]).default("bottom"),
      autoHide: z.boolean().default(false),
      reserveSpace: z.boolean().default(false),
      iconSize: z.number().min(32).max(96).default(56),
      magnification: z.number().min(1).max(1.8).default(1.6),
      monitors: z.enum(["primary", "all"]).default("primary"),
    })
    .default({}),
  appearance: z
    .object({
      theme: z.enum(["system", "light", "dark"]).default("system"),
      blurMode: z.enum(["mica", "acrylic", "blur", "none"]).default("mica"),
      blurStrength: z.number().min(0).max(64).default(24),
      tint: hexColor.default("#ffffff"),
      tintOpacity: z.number().min(0).max(1).default(0.12),
      radius: z.number().min(0).max(40).default(22),
      accent: hexColor.default("#4f8cff"),
    })
    .default({}),
  items: z.array(dockItemSchema).default([]),
  hotkeys: z
    .object({
      toggleDock: z.string().default("Ctrl+Alt+D"),
      commandPalette: z.string().default("Ctrl+Space"),
    })
    .default({}),
  workspaces: z.array(z.unknown()).default([]),
});

export type DockItem = z.infer<typeof dockItemSchema>;
export type DockConfig = z.infer<typeof dockConfigSchema>;

export function defaultConfig(): DockConfig {
  return dockConfigSchema.parse({ version: CONFIG_VERSION });
}

/**
 * Upgrade a raw config of any older version to the current one.
 * Add one step per schema change; v1 is the baseline so there is nothing to do yet.
 */
export function migrateConfig(raw: unknown): unknown {
  return raw;
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
