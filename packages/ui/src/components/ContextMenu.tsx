export interface MenuAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export const MENU_ROW = 34;

export function ContextMenu({
  title,
  actions,
  close,
}: {
  title: string;
  actions: MenuAction[];
  close: () => void;
}) {
  return (
    <div role="menu" aria-label={title} className="panel w-56 p-1.5 text-sm">
      <div className="truncate px-2.5 py-1.5 text-xs opacity-60">{title}</div>
      {actions.map((a) => (
        <div key={a.label}>
          {a.separatorBefore && <div className="my-1 h-px bg-white/15" />}
          <button
            role="menuitem"
            disabled={a.disabled}
            style={{ height: MENU_ROW }}
            onClick={() => {
              a.onSelect();
              close();
            }}
            className={`flex w-full items-center rounded-lg px-2.5 text-left outline-none hover:bg-white/15 focus-visible:bg-white/15 disabled:opacity-40 ${
              a.danger ? "text-red-400" : ""
            }`}
          >
            {a.label}
          </button>
        </div>
      ))}
    </div>
  );
}
