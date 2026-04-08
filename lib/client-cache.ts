type CacheEnvelope<T> = {
  version: number;
  expiresAt: number;
  data: T;
};

export function readClientCache<T>(key: string, version = 1): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (parsed.version !== version) return null;
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeClientCache<T>(
  key: string,
  data: T,
  ttlMs: number,
  version = 1
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheEnvelope<T> = {
      version,
      expiresAt: Date.now() + ttlMs,
      data,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* ignore quota / privacy mode */
  }
}
