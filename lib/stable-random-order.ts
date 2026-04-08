/** Deterministic "random-like" rank from stable string key. */
export function stableRandomRank(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function sortByStableRandom<T>(
  rows: T[],
  keyOf: (row: T) => string
): T[] {
  return [...rows].sort((a, b) => {
    const ra = stableRandomRank(keyOf(a));
    const rb = stableRandomRank(keyOf(b));
    if (ra !== rb) return ra - rb;
    return keyOf(a).localeCompare(keyOf(b));
  });
}
