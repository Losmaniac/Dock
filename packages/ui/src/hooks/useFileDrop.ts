import { useEffect } from "react";
import { currentDock } from "../lib/docks";
import { messageOf, useDock } from "../store/dockStore";

/**
 * Drop on an app item -> open the file with that app. Drop elsewhere -> pin it
 * (.exe / .lnk / folders). Paths are validated again in Rust.
 */
export function useFileDrop() {
  const platform = useDock((s) => s.platform)!;
  useEffect(
    () =>
      platform.onFilesDropped((paths, point) => {
        const { config, dockId, report, pinPath } = useDock.getState();
        const id = document
          .elementFromPoint(point.x, point.y)
          ?.closest("[data-item-id]")
          ?.getAttribute("data-item-id");
        const target = currentDock(config, dockId).items.find((i) => i.id === id);
        if (target?.type === "app") {
          for (const p of paths) {
            platform
              .launch({ type: "app", path: target.path, args: [...target.args, p] })
              .catch(report);
          }
          return;
        }
        for (const p of paths) {
          platform
            .describePath(p)
            .then(pinPath)
            .catch((e) => report(messageOf(e)));
        }
      }),
    [platform],
  );
}
