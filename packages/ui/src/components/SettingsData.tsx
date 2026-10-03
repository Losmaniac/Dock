import { useEffect, useRef, useState } from "react";
import { defaultConfig } from "@glass-dock/shared";
import { exportJson, importJson } from "../lib/configFile";
import { diagnosticsText } from "../lib/diagnostics";
import { FINISH_LABEL, THEMES, applyTheme } from "../lib/themes";
import { messageOf, useDock } from "../store/dockStore";
import { Row, Section, Toggle } from "./controls";

const btn = "rounded-lg bg-white/15 px-3 py-1 text-sm hover:bg-white/25";

export function ThemeGallery() {
  const setConfig = useDock((s) => s.setConfig);
  const edit = useDock((s) => s.edit);
  const a = useDock((s) => s.config.appearance);
  return (
    <Section title="Themes">
      <div className="grid grid-cols-3 gap-2 py-1">
        {THEMES.map((t) => (
          <button
            key={t.id}
            title={t.blurb}
            aria-pressed={a.themeId === t.id}
            onClick={() => setConfig(applyTheme(useDock.getState().config, t))}
            className={`flex flex-col items-center gap-1 rounded-lg p-1.5 text-xs hover:bg-white/15 ${a.themeId === t.id ? "ring-2 ring-accent" : ""}`}
          >
            <span
              className="h-8 w-full rounded-md border border-white/30"
              style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }}
            />
            {t.name}
          </button>
        ))}
      </div>
      <Row label="Finish">
        <span className="flex gap-1">
          {(Object.keys(FINISH_LABEL) as (keyof typeof FINISH_LABEL)[]).map((f) => (
            <button
              key={f}
              className={`${btn} ${a.finish === f ? "bg-accent text-white" : ""}`}
              onClick={() => edit((d) => void (d.appearance.finish = f))}
            >
              {FINISH_LABEL[f]}
            </button>
          ))}
        </span>
      </Row>
      <Row label="Accent from wallpaper">
        <Toggle
          value={a.accentFromWallpaper}
          onChange={(v) => edit((d) => void (d.appearance.accentFromWallpaper = v))}
        />
      </Row>
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

  const openData = () =>
    platform
      .getDataDir()
      .then((path) =>
        path.startsWith("(")
          ? report("The browser demo keeps its data in browser storage.")
          : platform.launch({ type: "folder", path }),
      )
      .catch((e) => report(messageOf(e)));

  const copyDiagnostics = async () => {
    const st = useDock.getState();
    const dataDir = await platform.getDataDir().catch(() => "unknown");
    const text = diagnosticsText(st.config, st.monitors, {
      userAgent: navigator.userAgent,
      dataDir,
    });
    try {
      await navigator.clipboard.writeText(text);
      report("Diagnostics copied. They contain no file names, keys or links.");
    } catch {
      report("Could not access the clipboard.");
    }
  };

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
              .setConfig({ ...defaultConfig(), docks: useDock.getState().config.docks })
          }
        >
          Reset settings
        </button>
        <button className={btn} onClick={openData}>
          Open data folder
        </button>
        <button className={btn} onClick={copyDiagnostics}>
          Copy diagnostics
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
