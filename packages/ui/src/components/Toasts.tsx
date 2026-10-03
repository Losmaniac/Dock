import { useDock } from "../store/dockStore";

/** Errors are always visible (AGENTS.md: never fail silently). */
export function Toasts() {
  const toasts = useDock((s) => s.toasts);
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-2 z-30 flex -translate-x-1/2 flex-col gap-1"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="panel max-w-sm px-3 py-1.5 text-xs">
          {t.text}
        </div>
      ))}
    </div>
  );
}
