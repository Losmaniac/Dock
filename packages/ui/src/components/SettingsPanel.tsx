import { X } from "lucide-react";
import { useDock } from "../store/dockStore";
import { Color, Row, Section, Select, Slider, Toggle } from "./controls";
import { HotkeyRows, MonitorRows, WidgetRows } from "./SettingsExtras";

export const SETTINGS_SIZE = { w: 440, h: 480 };

const fixed = (d: number) => (v: number) => v.toFixed(d).replace(".", ",");

/** Every change applies immediately, so the dock behind the panel is the live preview. */
export function SettingsPanel({ close }: { close: () => void }) {
  const config = useDock((s) => s.config);
  const edit = useDock((s) => s.edit);
  const { dock, appearance } = config;

  return (
    <div
      className="panel flex flex-col p-4"
      style={{ width: SETTINGS_SIZE.w, height: SETTINGS_SIZE.h }}
      role="dialog"
      aria-label="Settings"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Settings</h2>
        <button
          aria-label="Close settings"
          onClick={close}
          className="rounded-lg p-1 hover:bg-white/15"
        >
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <Section title="Layout">
          <Row label="Position">
            <Select
              value={dock.position}
              options={[
                { value: "bottom", label: "Bottom" },
                { value: "top", label: "Top" },
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
              onChange={(v) => edit((d) => void (d.dock.position = v))}
            />
          </Row>
          <Row label="Icon size">
            <Slider
              value={dock.iconSize}
              min={32}
              max={96}
              step={2}
              format={(v) => `${v} px`}
              onChange={(v) => edit((d) => void (d.dock.iconSize = v))}
            />
          </Row>
          <Row label="Magnification">
            <Slider
              value={dock.magnification}
              min={1}
              max={1.8}
              step={0.05}
              format={(v) => `${fixed(2)(v)}×`}
              onChange={(v) => edit((d) => void (d.dock.magnification = v))}
            />
          </Row>
          <MonitorRows />
          <Row label="Auto-hide">
            <Toggle
              value={dock.autoHide}
              onChange={(v) => edit((d) => void (d.dock.autoHide = v))}
            />
          </Row>
          <Row label="Reveal delay">
            <Slider
              value={dock.autoHideDelay}
              min={0}
              max={1000}
              step={50}
              format={(v) => `${v} ms`}
              onChange={(v) => edit((d) => void (d.dock.autoHideDelay = v))}
            />
          </Row>
        </Section>
        <Section title="Appearance">
          <Row label="Theme">
            <Select
              value={appearance.theme}
              options={[
                { value: "system", label: "Follow system" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              onChange={(v) => edit((d) => void (d.appearance.theme = v))}
            />
          </Row>
          <Row label="Blur">
            <Select
              value={appearance.blurMode}
              options={[
                { value: "mica", label: "Mica" },
                { value: "acrylic", label: "Acrylic" },
                { value: "blur", label: "Blur" },
                { value: "none", label: "None" },
              ]}
              onChange={(v) => edit((d) => void (d.appearance.blurMode = v))}
            />
          </Row>
          <Row label="Blur strength">
            <Slider
              value={appearance.blurStrength}
              min={0}
              max={64}
              step={2}
              format={(v) => `${v} px`}
              onChange={(v) => edit((d) => void (d.appearance.blurStrength = v))}
            />
          </Row>
          <Row label="Tint">
            <Color
              value={appearance.tint}
              onChange={(v) => edit((d) => void (d.appearance.tint = v))}
            />
          </Row>
          <Row label="Tint opacity">
            <Slider
              value={appearance.tintOpacity}
              min={0}
              max={1}
              step={0.02}
              format={fixed(2)}
              onChange={(v) => edit((d) => void (d.appearance.tintOpacity = v))}
            />
          </Row>
          <Row label="Corner radius">
            <Slider
              value={appearance.radius}
              min={0}
              max={40}
              step={1}
              format={(v) => `${v} px`}
              onChange={(v) => edit((d) => void (d.appearance.radius = v))}
            />
          </Row>
          <Row label="Accent">
            <Color
              value={appearance.accent}
              onChange={(v) => edit((d) => void (d.appearance.accent = v))}
            />
          </Row>
          <Row label="Solid (no transparency)">
            <Toggle
              value={appearance.solid}
              onChange={(v) => edit((d) => void (d.appearance.solid = v))}
            />
          </Row>
        </Section>
        <WidgetRows />
        <HotkeyRows />
      </div>
    </div>
  );
}
