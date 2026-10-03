import { useCallback, useEffect, useRef, useState } from "react";
import type { AppEntry } from "../lib/overlay";

export interface PreviewState {
  entry: AppEntry;
  /** Item center along the bar axis, relative to the bar's start. */
  anchor: number;
}

/** Hover-intent preview: opens after a short delay, closes shortly after the pointer leaves both. */
export function usePreview(disabled: boolean) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancelClose = useCallback(() => clearTimeout(closeTimer.current), []);
  const scheduleClose = useCallback(() => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setPreview(null), 220);
  }, []);

  const hover = useCallback(
    (entry: AppEntry, anchor: number | null) => {
      if (anchor === null) return scheduleClose();
      cancelClose();
      if (disabled || entry.windows.length === 0) return;
      clearTimeout(openTimer.current);
      openTimer.current = setTimeout(() => setPreview({ entry, anchor }), 450);
    },
    [disabled, cancelClose, scheduleClose],
  );

  useEffect(() => {
    if (disabled) setPreview(null);
  }, [disabled]);
  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  return { preview, hover, keep: cancelClose, leave: scheduleClose };
}
