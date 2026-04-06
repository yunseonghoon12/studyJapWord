const BATCH_KEY = "wordStudy.batchSize";
const PROGRESS_KEY = "wordStudy.levelBatchCleared";

export const BATCH_SIZE_MIN = 5;
export const BATCH_SIZE_MAX = 50;
/** 기본 20. 마지막 세트는 남은 단어 수가 20 미만이면 그만큼만 한 세트로 묶음 */
export const BATCH_SIZE_DEFAULT = 20;

export function getBatchSize(): number {
  if (typeof window === "undefined") return BATCH_SIZE_DEFAULT;
  const n = Number(localStorage.getItem(BATCH_KEY));
  if (!Number.isFinite(n)) return BATCH_SIZE_DEFAULT;
  return Math.min(
    BATCH_SIZE_MAX,
    Math.max(BATCH_SIZE_MIN, Math.round(n))
  );
}

export function setBatchSize(n: number): void {
  localStorage.setItem(
    BATCH_KEY,
    String(
      Math.min(
        BATCH_SIZE_MAX,
        Math.max(BATCH_SIZE_MIN, Math.round(n))
      )
    )
  );
}

export function getClearedBatchCount(level: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return 0;
    const o = JSON.parse(raw) as Record<string, { cleared?: number }>;
    const c = o[level]?.cleared;
    return typeof c === "number" && c >= 0 ? Math.floor(c) : 0;
  } catch {
    return 0;
  }
}

export function setClearedBatchCount(level: string, cleared: number): void {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const o = raw ? (JSON.parse(raw) as Record<string, { cleared?: number }>) : {};
    o[level] = { cleared: Math.max(0, Math.floor(cleared)) };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(o));
  } catch {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ [level]: { cleared: Math.max(0, Math.floor(cleared)) } })
    );
  }
}
