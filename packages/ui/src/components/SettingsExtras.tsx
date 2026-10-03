import { useEffect, useState } from "react";
import { SNAP_LAYOUTS } from "../lib/actions";
import { useDock } from "../store/dockStore";
import { Row, Section, Select, Toggle } from "./controls";
import { WIDGETS, WIDGET_GROUPS } from "../widgets/registry";
import type { WidgetKind } from "@glass-dock/shared";

export function MonitorRows() {
  const monitors = useDock((s) => s.monitors);
  const dock = useDock((s) => s.config.dock);
  const edit = useDock((s) => s.edit);
  const options = [
    { value: "primary", label: "Primary" },
    ...monitors.map((m, i) => ({ value: m.id, label: `${i + 1}: ${m.width}×${m.height}` })),
  ];
  return (
    <>
      <Row label="Monitor">
        <Select
          value={dock.monitor}
          options={options}
          onChange={(v) => edit((d) => void (d.dock.monitor = v))}
        />
      </Row>
      <Row label="Reserve screen space">
        <Toggle
          value={dock.reserveSpace}
          onChange={(v) => edit((d) => void (d.dock.reserveSpace = v))}
        />
      </Row>
      <Row label="Hide Windows taskbar">
        <Toggle
          value={dock.hideTaskbar}
          onChange={(v) => edit((d) => void (d.dock.hideTaskbar = v))}
        />
      </Row>
      {dock.hideTaskbar && (
        <p className="pb-1 text-xs opacity-60">
          The taskbar comes back when the dock exits, if it crashes (a small guard process restores
          it), or when you switch this off. Palette action: "Show Windows taskbar".
        </p>
      )}
      {dock.reserveSpace && dock.autoHide && (
        <p className="pb-1 text-xs opacity-60">Space is not reserved while auto-hide is on.</p>
      )}
    </>
  );
}

export function IntegrationRows() {
  const cfg = useDock((s) => s.config.integrations);
  const edit = useDock((s) => s.edit);
  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    placeholder: string,
    wide = false,
  ) => (
    <Row label={label}>
      <AccelInput
        label={label}
        value={value}
        onCommit={set}
        placeholder={placeholder}
        wide={wide}
      />
    </Row>
  );
  return (
    <Section title="Online widgets (opt-in, network)">
      {field(
        "Calendar ICS link",
        cfg.calendarUrl,
        (v) => edit((d) => void (d.integrations.calendarUrl = v)),
        "https://…/basic.ics",
        true,
      )}
      {field(
        "Weather city",
        cfg.weatherCity,
        (v) => edit((d) => void (d.integrations.weatherCity = v)),
        "Prague",
      )}
      {field(
        "OpenWeatherMap key",
        cfg.weatherKey,
        (v) => edit((d) => void (d.integrations.weatherKey = v)),
        "api key",
      )}
      <p className="text-xs opacity-60">
        Nothing is requested until a value is set and the widget is on the dock. The key is stored
        in your local config in plain text.
      </p>
    </Section>
  );
}

export function WidgetRows() {
  const items = useDock((s) => s.config.items);
  const toggle = useDock((s) => s.toggleWidget);
  const setSize = useDock((s) => s.setWidgetSize);
  const kinds = Object.keys(WIDGETS) as WidgetKind[];
  return (
    <Section title="Widgets">
      {WIDGET_GROUPS.map((group) => (
        <div key={group} className="mb-2">
          <div className="text-xs opacity-60">{group}</div>
          {kinds
            .filter((k) => WIDGETS[k].group === group)
            .map((w) => {
              const item = items.find((i) => i.type === "widget" && i.widget === w);
              const on = item?.type === "widget";
              return (
                <Row key={w} label={WIDGETS[w].label}>
                  <span className="flex items-center gap-2">
                    {on && (
                      <button
                        className="rounded bg-white/15 px-2 text-xs hover:bg-white/25"
                        onClick={() => setSize(w, item.size === "wide" ? "compact" : "wide")}
                      >
                        {item.size === "wide" ? "Wide" : "Compact"}
                      </button>
                    )}
                    <Toggle value={on} onChange={(v) => toggle(w, v)} />
                  </span>
                </Row>
              );
            })}
        </div>
      ))}
    </Section>
  );
}

/** Commits on blur or Enter so a half-typed accelerator is never registered. */
export function AccelInput({
  value,
  onCommit,
  label,
  placeholder = "none",
  wide = false,
}: {
  value: string;
  onCommit: (v: string) => void;
  label: string;
  placeholder?: string;
  wide?: boolean;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      aria-label={label}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onCommit(text.trim())}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`${wide ? "w-56" : "w-40"} rounded-lg bg-white/15 px-2 py-1 text-sm outline-none`}
    />
  );
}

export function HotkeyRows() {
  const hk = useDock((s) => s.config.hotkeys);
  const edit = useDock((s) => s.edit);
  return (
    <Section title="Hotkeys (empty = off)">
      <Row label="Toggle dock">
        <AccelInput
          label="Toggle dock"
          value={hk.toggleDock}
          onCommit={(v) => edit((d) => void (d.hotkeys.toggleDock = v))}
        />
      </Row>
      <Row label="Command palette">
        <AccelInput
          label="Command palette"
          value={hk.commandPalette}
          onCommit={(v) => edit((d) => void (d.hotkeys.commandPalette = v))}
        />
      </Row>
      <Row label="Launcher">
        <AccelInput
          label="Launcher"
          value={hk.launcher}
          onCommit={(v) => edit((d) => void (d.hotkeys.launcher = v))}
        />
      </Row>
      <Row label="Window switcher">
        <AccelInput
          label="Window switcher"
          value={hk.switcher}
          onCommit={(v) => edit((d) => void (d.hotkeys.switcher = v))}
        />
      </Row>
      <Row label="Jump to item 1–9">
        <AccelInput
          label="Jump modifier"
          value={hk.jumpModifier}
          onCommit={(v) => edit((d) => void (d.hotkeys.jumpModifier = v))}
        />
      </Row>
      {SNAP_LAYOUTS.map(({ layout, label }) => (
        <Row key={layout} label={`Snap: ${label}`}>
          <AccelInput
            label={`Snap ${label}`}
            value={hk.snap[layout] ?? ""}
            onCommit={(v) =>
              edit((d) => {
                if (v) d.hotkeys.snap[layout] = v;
                else delete d.hotkeys.snap[layout];
              })
            }
          />
        </Row>
      ))}
    </Section>
  );
}
