import { dockConfigSchema, migrateConfig, type DockConfig } from "@glass-dock/shared";

export const exportJson = (cfg: DockConfig): string => JSON.stringify(cfg, null, 2);

export type ImportResult = { ok: true; config: DockConfig } | { ok: false; error: string };

/** Strict: an invalid file is rejected with a reason instead of silently replaced by defaults. */
export function importJson(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  const res = dockConfigSchema.safeParse(migrateConfig(raw));
  if (res.success) return { ok: true, config: res.data };
  const first = res.error.issues[0];
  return {
    ok: false,
    error: `Invalid config: ${first?.path.join(".") || "root"}: ${first?.message ?? "unknown error"}`,
  };
}
