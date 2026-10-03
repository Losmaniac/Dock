import { useEffect, useState } from "react";
import { SNAP_LAYOUTS } from "../lib/actions";
import type { WidgetKind } from "../lib/overlay";
import { useDock } from "../store/dockStore";
import { Row, Section, Select, Toggle } from "./controls";
import { WIDGET_LABEL } from "./WidgetFace";

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
      {dock.reserveSpace && dock.autoHide && (
        <p className="pb-1 text-xs opacity-60">Space is not reserved while auto-hide is on.</p>
      )}
    </>
  );
}

const WIDGETS = Object.keys(WIDGET_LABEL) as WidgetKind[];

export function WidgetRows() {
  const items = useDock((s) => s.config.items);
  const toggle = useDock((s) => s.toggleWidget);
  return (
    <Section title="Widgets">
      {WIDGETS.map((w) => (
        <Row key={w} label={WIDGET_LABEL[w]}>
          <Toggle
            value={items.some((i) => i.type === "widget" && i.widget === w)}
            onChange={(on) => toggle(w, on)}
          />
        </Row>
      ))}
    </Section>
  );
}

/** Commits on blur or Enter so a half-typed accelerator is never registered. */
function AccelInput({
  value,
  onCommit,
  label,
}: {
  value: string;
  onCommit: (v: string) => void;
  label: string;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      aria-label={label}
      value={text}
      placeholder="none"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onCommit(text.trim())}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="w-40 rounded-lg bg-white/15 px-2 py-1 text-sm outline-none"
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
