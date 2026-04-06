const KEY = "wordStudy.favoriteWordIds";

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("wordStudy-favorites-changed"));
}

export function getFavoriteWordIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function setFavoriteWordIds(ids: string[]): void {
  const unique = [...new Set(ids)];
  localStorage.setItem(KEY, JSON.stringify(unique));
  emitChange();
}

/** @returns 즐겨찾기에 넣었으면 true, 해제했으면 false */
export function toggleFavoriteWordId(wordId: string): boolean {
  const ids = getFavoriteWordIds();
  const i = ids.indexOf(wordId);
  if (i >= 0) {
    ids.splice(i, 1);
    setFavoriteWordIds(ids);
    return false;
  }
  setFavoriteWordIds([...ids, wordId]);
  return true;
}

export function isFavoriteWordId(wordId: string): boolean {
  return getFavoriteWordIds().includes(wordId);
}
