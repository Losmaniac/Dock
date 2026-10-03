import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface MenuAction {
  label: string;
  onSelect?: () => void;
  /** Opens a nested list instead of running `onSelect`. */
  children?: MenuAction[];
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export const MENU_ROW = 34;

/** Rows needed to show the longest list (top level or any submenu). */
export const menuRows = (actions: MenuAction[]): number =>
  Math.max(actions.length, ...actions.map((a) => (a.children ? a.children.length + 1 : 0)));

export function ContextMenu({
  title,
  actions,
  close,
}: {
  title: string;
  actions: MenuAction[];
  close: () => void;
}) {
  const [parent, setParent] = useState<MenuAction | null>(null);
  const list = parent?.children ?? actions;
  const root = useRef<HTMLDivElement>(null);
  // Focus the first row whenever the list changes so arrow keys work immediately.
  useEffect(
    () => root.current?.querySelector<HTMLElement>("[role=menuitem]:not(:disabled)")?.focus(),
    [parent],
  );

  return (
    <div
      ref={root}
      role="menu"
      aria-label={title}
      className="panel w-56 p-1.5 text-sm"
      onKeyDown={(e) => {
        const rows = [
          ...(root.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not(:disabled)") ?? []),
        ];
        const i = rows.indexOf(document.activeElement as HTMLElement);
        if (e.key === "ArrowDown") rows[(i + 1) % rows.length]?.focus();
        else if (e.key === "ArrowUp") rows[(i - 1 + rows.length) % rows.length]?.focus();
        else if (e.key === "ArrowLeft" && parent) setParent(null);
        else return;
        e.preventDefault();
      }}
    >
      <div className="truncate px-2.5 py-1.5 text-xs opacity-60">
        {parent ? `‹ ${parent.label}` : title}
      </div>
      {parent && (
        <button
          role="menuitem"
          style={{ height: MENU_ROW }}
          onClick={() => setParent(null)}
          className="flex w-full items-center rounded-lg px-2.5 text-left outline-none hover:bg-white/15 focus-visible:bg-white/15"
        >
          Back
        </button>
      )}
      {list.map((a) => (
        <div key={a.label}>
          {a.separatorBefore && <div className="my-1 h-px bg-white/15" />}
          <button
            role="menuitem"
            aria-checked={a.checked}
            disabled={a.disabled}
            style={{ height: MENU_ROW }}
            onClick={() => {
              if (a.children) return setParent(a);
              a.onSelect?.();
              close();
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 text-left outline-none hover:bg-white/15 focus-visible:bg-white/15 disabled:opacity-40 ${a.danger ? "text-red-400" : ""}`}
          >
            <span>
              {a.checked ? "✓ " : ""}
              {a.label}
            </span>
            {a.children && <ChevronRight size={14} />}
          </button>
        </div>
      ))}
    </div>
  );
}
