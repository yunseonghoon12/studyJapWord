import { jlptLevelToneBadgeClass } from "@/components/jlpt-level-styles";

/**
 * `/study` 레벨 선택·진행률 — 색상은 `jlpt-level-styles` 톤 팔레트와 단일 소스.
 */
export function studyIndexLevelBadgeClass(level: string, enabled: boolean): string {
  return jlptLevelToneBadgeClass(level, enabled);
}

const rowBase =
  "group flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200/60 bg-white/90 px-3 py-2.5 transition-[box-shadow,background-color,border-color] duration-200";

export function studyIndexRowClass(level: string, enabled: boolean): string {
  if (enabled) {
    return [
      rowBase,
      "shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-zinc-300/70 hover:bg-white hover:shadow-[0_4px_20px_rgba(15,23,42,0.05)]",
    ].join(" ");
  }
  return [
    rowBase,
    "cursor-not-allowed border-dashed border-zinc-300/55 bg-zinc-50/80",
  ].join(" ");
}

export const STUDY_INDEX_PROGRESS_CARD_CLASS = [
  "rounded-lg border border-zinc-200/55 bg-white/95 px-2.5 py-2",
  "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
  "transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(15,23,42,0.05)]",
].join(" ");

export const studyIndexSectionClass =
  "mt-6 rounded-xl border border-zinc-200/55 bg-zinc-50/40 px-3.5 py-3.5 backdrop-blur-sm sm:px-4";

export const studyIndexSectionTitleClass =
  "text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500";
