import { useCurrentDock, useDock } from "../store/dockStore";
import { Row, Section, Select, Toggle } from "./controls";
import { AccelInput } from "./SettingsHotkeys";
import { WIDGETS, WIDGET_GROUPS } from "../widgets/registry";
import type { WidgetKind } from "@glass-dock/shared";

export function MonitorRows() {
  const monitors = useDock((s) => s.monitors);
  const dock = useCurrentDock();
  const edit = useDock((s) => s.edit);
  const editDock = useDock((s) => s.editDock);
  const hideTaskbar = useDock((s) => s.config.system.hideTaskbar);
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
          onChange={(v) => editDock((d) => void (d.monitor = v))}
        />
      </Row>
      <Row label="Reserve screen space">
        <Toggle
          value={dock.reserveSpace}
          onChange={(v) => editDock((d) => void (d.reserveSpace = v))}
        />
      </Row>
      <Row label="Hide Windows taskbar">
        <Toggle
          value={hideTaskbar}
          onChange={(v) => edit((d) => void (d.system.hideTaskbar = v))}
        />
      </Row>
      {hideTaskbar && (
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
  const items = useCurrentDock().items;
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
