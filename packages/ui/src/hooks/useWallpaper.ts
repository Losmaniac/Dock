import { useEffect, useState } from "react";
import { analyzeWallpaper, type WallpaperColors } from "../lib/wallpaper";
import { useDock } from "../store/dockStore";

/** Reads the desktop wallpaper (downscaled to 32x32 in a canvas) while a wallpaper color is wanted. */
export function useWallpaper(enabled: boolean): WallpaperColors | null {
  const platform = useDock((s) => s.platform)!;
  const [colors, setColors] = useState<WallpaperColors | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      const url = await platform.getWallpaper().catch(() => null);
      if (!url || !alive) return;
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        const c = document.createElement("canvas");
        c.width = c.height = 32;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 32, 32);
        setColors(analyzeWallpaper(ctx.getImageData(0, 0, 32, 32).data));
      };
      img.src = url;
    };
    void load();
    const t = setInterval(() => void load(), 5 * 60_000); // picks up a changed wallpaper
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [platform, enabled]);

  return enabled ? colors : null;
}
