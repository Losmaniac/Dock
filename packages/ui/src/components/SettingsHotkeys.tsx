import { useEffect, useState } from "react";
import { SNAP_LAYOUTS } from "../lib/actions";
import { useDock } from "../store/dockStore";
import { Row, Section } from "./controls";

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
