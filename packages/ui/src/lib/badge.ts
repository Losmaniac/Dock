/**
 * Best-effort notification badges. Windows exposes no API for another app's taskbar badge,
 * so we read the unread count many apps put in their window title: "(3) Inbox", "[2] Chat",
 * "Inbox (5)". It is a heuristic and can be wrong.
 */
export function badgeFromTitle(title: string): number {
  const m = /^[([](\d{1,3})[)\]]\s|\s[([](\d{1,3})[)\]]$/.exec(title.trim());
  const n = Number(m?.[1] ?? m?.[2] ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export const totalBadge = (titles: string[]): number =>
  titles.reduce((a, t) => a + badgeFromTitle(t), 0);
