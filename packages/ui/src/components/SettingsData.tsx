import { useEffect, useRef, useState } from "react";
import { defaultConfig } from "@glass-dock/shared";
import { exportJson, importJson } from "../lib/configFile";
import { PRESETS, applyPreset } from "../lib/presets";
import { messageOf, useDock } from "../store/dockStore";
import { Row, Section, Toggle } from "./controls";

const btn = "rounded-lg bg-white/15 px-3 py-1 text-sm hover:bg-white/25";

export function PresetRows() {
  const setConfig = useDock((s) => s.setConfig);
  return (
    <Section title="Presets">
      <div className="flex gap-2 py-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className={btn}
            onClick={() => setConfig(applyPreset(useDock.getState().config, p))}
          >
            {p.name}
          </button>
        ))}
      </div>
    </Section>
  );
}

export function DataRows() {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  const [auto, setAuto] = useState<boolean | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void platform
      .getAutostart()
      .then(setAuto)
      .catch(() => setAuto(null));
  }, [platform]);

  const doExport = () =>
    platform
      .exportConfig(exportJson(useDock.getState().config))
      .then((where) => report(`Exported to ${where}`))
      .catch((e) => report(messageOf(e)));

  const doImport = async (f: File | undefined) => {
    if (!f) return;
    const res = importJson(await f.text());
    if (res.ok) {
      useDock.getState().setConfig(res.config);
      report("Config imported.");
    } else report(res.error);
  };

  return (
    <Section title="Startup and data">
      <Row label="Launch at startup">
        <Toggle
          value={auto ?? false}
          onChange={(on) =>
            platform
              .setAutostart(on)
              .then(() => setAuto(on))
              .catch((e) => report(messageOf(e)))
          }
        />
      </Row>
      <div className="flex flex-wrap gap-2 py-1">
        <button className={btn} onClick={doExport}>
          Export config
        </button>
        <button className={btn} onClick={() => file.current?.click()}>
          Import config
        </button>
        <button
          className={btn}
          onClick={() =>
            useDock
              .getState()
              .setConfig({ ...defaultConfig(), items: useDock.getState().config.items })
          }
        >
          Reset settings
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Import config file"
          onChange={(e) => {
            void doImport(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-xs opacity-60">
        Unread badges on app icons are read from window titles such as "(3) Inbox". Windows offers
        no real API for other apps' badges, so this is best effort.
      </p>
    </Section>
  );
}
