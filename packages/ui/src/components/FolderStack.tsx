import { useEffect, useState } from "react";
import { Folder } from "lucide-react";
import type { DockItem, FolderEntry } from "@glass-dock/shared";
import { messageOf, useDock } from "../store/dockStore";

export const STACK_SIZE = { w: 380, h: 300 };

type FolderItem = Extract<DockItem, { type: "folder" }>;

export function FolderStack({ item, close }: { item: FolderItem; close: () => void }) {
  const platform = useDock((s) => s.platform)!;
  const icons = useDock((s) => s.icons);
  const loadIcon = useDock((s) => s.loadIcon);
  const report = useDock((s) => s.report);
  const [entries, setEntries] = useState<FolderEntry[] | null>(null);

  useEffect(() => {
    platform
      .listFolder(item.path)
      .then((list) => {
        setEntries(list);
        list.filter((e) => !e.isDir).forEach((e) => loadIcon(e.path, { path: e.path }));
      })
      .catch((e) => {
        report(messageOf(e));
        close();
      });
  }, [platform, item.path, loadIcon, report, close]);

  const open = (e: FolderEntry) => {
    void platform
      .launch(e.isDir ? { type: "folder", path: e.path } : { type: "file", path: e.path })
      .catch(report);
    close();
  };

  return (
    <div className="panel flex flex-col p-3" style={{ width: STACK_SIZE.w, height: STACK_SIZE.h }}>
      <div className="mb-2 truncate text-sm font-semibold">{item.label}</div>
      <div className="grid min-h-0 flex-1 grid-cols-4 content-start gap-2 overflow-y-auto">
        {entries?.map((e) => (
          <button
            key={e.path}
            onClick={() => open(e)}
            title={e.name}
            className="flex flex-col items-center gap-1 rounded-lg p-1.5 text-[11px] hover:bg-white/15"
          >
            {e.isDir || !icons[e.path] ? (
              <Folder size={36} className={e.isDir ? "" : "opacity-50"} />
            ) : (
              <img src={icons[e.path]} alt="" className="h-9 w-9" draggable={false} />
            )}
            <span className="w-full truncate text-center">{e.name}</span>
          </button>
        ))}
        {entries?.length === 0 && <p className="col-span-4 text-sm opacity-60">Empty folder</p>}
      </div>
    </div>
  );
}
