import { useLayoutEffect, type RefObject } from "react";
import { useDock } from "../store/dockStore";

/**
 * Asks Rust to draw a live DWM thumbnail of `hwnd` over the element's rectangle. The window may
 * still be resizing when this runs (previews grow it), so the rectangle is re-sent on resize
 * and a few times shortly after mount.
 */
export function useThumbnail(ref: RefObject<HTMLElement | null>, hwnd: string, enabled: boolean) {
  const platform = useDock((s) => s.platform)!;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const send = () => {
      const r = el.getBoundingClientRect();
      const d = window.devicePixelRatio || 1;
      platform
        .showThumbnail(hwnd, {
          x: Math.round(r.left * d),
          y: Math.round(r.top * d),
          w: Math.round(r.width * d),
          h: Math.round(r.height * d),
        })
        .catch(() => {}); // window may have just closed
    };
    send();
    const timers = [50, 150, 400].map((ms) => setTimeout(send, ms));
    const ro = new ResizeObserver(send);
    ro.observe(el);
    window.addEventListener("resize", send);
    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
      window.removeEventListener("resize", send);
    };
  }, [platform, ref, hwnd, enabled]);

  // Thumbnails live in Rust; drop them all when the owning view goes away.
  useLayoutEffect(() => () => void platform.hideThumbnails().catch(() => {}), [platform]);
}
