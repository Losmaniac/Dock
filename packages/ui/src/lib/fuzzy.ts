const WORD_BREAK = new Set([" ", "-", "_", ".", "/", "\\"]);

/**
 * Subsequence match with bonuses for word starts, consecutive runs and prefixes.
 * Returns null when `query` is not a subsequence of `text`. Higher is better.
 */
export function fuzzyScore(query: string, text: string): number | null {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let ti = 0;
  let score = 0;
  let prev = -2;
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi]!, ti);
    if (found === -1) return null;
    if (found === prev + 1) score += 5; // consecutive
    if (found === 0)
      score += 10; // prefix
    else if (WORD_BREAK.has(t[found - 1]!)) score += 8; // word start
    score += 1 - Math.min(found - ti, 6) * 0.5; // small gap penalty
    prev = found;
    ti = found + 1;
  }
  return score - t.length * 0.01; // prefer shorter titles on ties
}

export function rank<T>(
  items: readonly T[],
  query: string,
  textOf: (t: T) => string,
  limit = 50,
): T[] {
  if (!query.trim()) return items.slice(0, limit);
  const scored: { item: T; score: number; i: number }[] = [];
  items.forEach((item, i) => {
    const score = fuzzyScore(query.trim(), textOf(item));
    if (score !== null) scored.push({ item, score, i });
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.slice(0, limit).map((s) => s.item);
}
