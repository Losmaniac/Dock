import type { DockConfig } from "@glass-dock/shared";
import { defaultConfig, parseConfig } from "@glass-dock/shared";

/**
 * Turn raw stored text into a config. Missing file -> defaults. Corrupt file -> defaults,
 * but the bad file is backed up first (never deleted).
 */
export async function loadConfigFromRaw(
  raw: string | null,
  backup: () => Promise<unknown>,
): Promise<DockConfig> {
  if (raw === null) return defaultConfig();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await backup();
    return defaultConfig();
  }
  const res = parseConfig(parsed);
  if (!res.ok) await backup();
  return res.config;
}
