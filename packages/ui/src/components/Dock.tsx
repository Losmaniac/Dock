import { useMotionValue } from "framer-motion";
import { useEffect, useState } from "react";
import type { DockConfig, WindowInfo } from "@glass-dock/shared";
import { usePlatform } from "../platform-context";
import { DockItem } from "./DockItem";

export function Dock() {
  const platform = usePlatform();
  const [config, setConfig] = useState<DockConfig | null>(null);
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const mouseX = useMotionValue(Infinity);

  useEffect(() => {
    let alive = true;
    void platform.loadConfig().then((c) => alive && setConfig(c));
    void platform.listWindows().then((w) => alive && setWindows(w));
    const off = platform.onWindowsChanged(setWindows);
    return () => {
      alive = false;
      off();
    };
  }, [platform]);

  useEffect(() => {
    if (!config) return;
    for (const it of config.items) {
      if (it.type !== "app") continue;
      void platform
        .getIcon({ path: it.path })
        .then((url) => setIcons((m) => ({ ...m, [it.path]: url })));
    }
  }, [platform, config]);

  if (!config) return null;
  const { iconSize, magnification } = config.dock;

  return (
    <div className="flex h-full items-end justify-center pb-3">
      <nav
        aria-label="Dock"
        className="glass flex items-end gap-2 px-3 pb-2 pt-3"
        onPointerMove={(e) => mouseX.set(e.clientX)}
        onPointerLeave={() => mouseX.set(Infinity)}
      >
        {config.items.map((it) => {
          if (it.type !== "app") return null;
          const win = windows.find((w) => w.processPath === it.path);
          return (
            <DockItem
              key={it.id}
              label={it.label}
              icon={icons[it.path]}
              size={iconSize}
              magnification={magnification}
              mouseX={mouseX}
              running={!!win}
              focused={!!win?.focused}
              minimized={!!win?.minimized}
              onClick={() => {
                if (!win) void platform.launch({ type: "app", path: it.path, args: it.args });
                else if (win.focused) void platform.minimizeWindow(win.hwnd);
                else void platform.focusWindow(win.hwnd);
              }}
            />
          );
        })}
      </nav>
    </div>
  );
}
