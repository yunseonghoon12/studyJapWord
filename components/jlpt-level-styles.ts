export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
export type JlptLevel = (typeof JLPT_LEVELS)[number];

const LEVEL_SET = new Set<string>(JLPT_LEVELS);

function normalize(level: string): JlptLevel {
  return (LEVEL_SET.has(level) ? level : "N5") as JlptLevel;
}

/**
 * 레벨 선택(`/study`)과 동일한 톤온톤 팔레트.
 * N1 스카이 · N2 바이올렛 · N3 로즈 · N4 오렌지 · N5 앰버 — 플랫, 그림자·두꺼운 테두리 없음.
 */
const TONE: Record<
  JlptLevel,
  {
    plain: string;
    active: string;
    muted: string;
    meta: string;
  }
> = {
  N1: {
    plain: "bg-sky-100 text-sky-800",
    active:
      "bg-sky-200 text-sky-950 ring-2 ring-sky-400/35 ring-offset-1 ring-offset-white",
    muted: "bg-sky-100/50 text-sky-600/75",
    meta: "text-sky-800",
  },
  N2: {
    plain: "bg-violet-100 text-violet-800",
    active:
      "bg-violet-200 text-violet-950 ring-2 ring-violet-400/35 ring-offset-1 ring-offset-white",
    muted: "bg-violet-100/50 text-violet-600/75",
    meta: "text-violet-800",
  },
  N3: {
    plain: "bg-rose-100 text-rose-800",
    active:
      "bg-rose-200 text-rose-950 ring-2 ring-rose-400/35 ring-offset-1 ring-offset-white",
    muted: "bg-rose-100/50 text-rose-600/75",
    meta: "text-rose-800",
  },
  N4: {
    plain: "bg-orange-100 text-orange-800",
    active:
      "bg-orange-200 text-orange-950 ring-2 ring-orange-400/35 ring-offset-1 ring-offset-white",
    muted: "bg-orange-100/50 text-orange-600/75",
    meta: "text-orange-800",
  },
  N5: {
    plain: "bg-amber-100 text-amber-900",
    active:
      "bg-amber-200 text-amber-950 ring-2 ring-amber-400/35 ring-offset-1 ring-offset-white",
    muted: "bg-amber-100/50 text-amber-800/70",
    meta: "text-amber-900",
  },
};

const pillBase =
  "inline-flex min-w-[2.25rem] shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums tracking-tight";

export function jlptLevelToneBadgeClass(level: string, enabled: boolean): string {
  const t = TONE[normalize(level)];
  return `${pillBase} ${enabled ? t.plain : t.muted}`;
}

export function jlptLevelPillClass(level: string): string {
  return `${pillBase} ${TONE[normalize(level)].plain}`;
}

export function jlptLevelPillMutedClass(level: string): string {
  return `${pillBase} ${TONE[normalize(level)].muted}`;
}

const toggleBase =
  "rounded-md px-3 py-1.5 text-sm font-semibold tabular-nums tracking-tight transition [-webkit-tap-highlight-color:transparent]";

export function jlptLevelToggleClass(level: string, active: boolean): string {
  const t = TONE[normalize(level)];
  return `${toggleBase} ${active ? t.active : `${t.plain} hover:brightness-[0.97]`}`;
}

export function jlptLevelStudyRowClass(level: string, enabled: boolean): string {
  const base =
    "flex items-center justify-between gap-3 rounded-lg border border-zinc-200/60 bg-white/90 px-3 py-2.5";
  return enabled
    ? `${base} shadow-sm hover:border-zinc-300/70`
    : `${base} cursor-not-allowed border-dashed border-zinc-300/55 bg-zinc-50/80`;
}

/** 학습 진행률 바 채움색 — 뱃지 톤과 맞춘 채도 */
const PROGRESS_BAR_FILL: Record<JlptLevel, string> = {
  N1: "bg-sky-500",
  N2: "bg-violet-500",
  N3: "bg-rose-500",
  N4: "bg-orange-500",
  N5: "bg-amber-500",
};

/** 세트 선택용 파스텔 진행 바 채움색 — 뱃지 계열 유지, 채도 완화 */
const PROGRESS_BAR_FILL_PASTEL: Record<JlptLevel, string> = {
  N1: "bg-sky-300/85",
  N2: "bg-violet-300/85",
  N3: "bg-rose-300/85",
  N4: "bg-orange-300/85",
  N5: "bg-amber-300/85",
};

export function jlptLevelProgressBarFillClass(level: string): string {
  return PROGRESS_BAR_FILL[normalize(level)];
}

export function jlptLevelProgressBarFillPastelClass(level: string): string {
  return PROGRESS_BAR_FILL_PASTEL[normalize(level)];
}

export function jlptLevelProgressPillClass(level: string): string {
  return `${pillBase} text-[11px] ${TONE[normalize(level)].plain} min-w-[2.5rem] px-2 py-0.5`;
}

export function jlptLevelRowCountTextClass(level: string): string {
  return `font-medium tabular-nums ${TONE[normalize(level)].meta}`;
}

export function jlptLevelProgressPercentTextClass(level: string): string {
  return `font-semibold tabular-nums ${TONE[normalize(level)].meta}`;
}

export function jlptLevelRowDisabledHintClass(level: string): string {
  return `font-medium ${TONE[normalize(level)].muted}`;
}
