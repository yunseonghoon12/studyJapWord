"use client";

import { useEffect, useMemo, useState } from "react";
import { FavoriteStarButton } from "@/components/FavoriteStarButton";
import { StudyCard } from "@/components/StudyCard";
import {
  JLPT_LEVELS,
  jlptLevelPillClass,
  jlptLevelToggleClass,
  type JlptLevel,
} from "@/components/jlpt-level-styles";
import type { VocabularyWordRow as WordRow } from "@/lib/vocabulary-cache";

const PAGE_SIZE = 20;

type Props = {
  words: WordRow[];
  /** false면 단어 공부「모든 단어」처럼 한 레벨만 — 난이도 칩 숨김 */
  showLevelFilter: boolean;
  /**
   * 세트 화면 상단 카드 안에 넣을 때 — 목록만 렌더(바깥 카드·헤더는 부모).
   */
  embedded?: boolean;
};

const rowSurface =
  "rounded-2xl border border-zinc-200/80 bg-white/90 shadow-[0_4px_14px_rgba(24,24,27,0.06)] transition duration-200 [-webkit-tap-highlight-color:transparent] hover:border-zinc-300/90 hover:shadow-[0_8px_22px_rgba(24,24,27,0.1)] active:scale-[0.99]";

export function VocabularyStudyWordsList({
  words: sourceWords,
  showLevelFilter,
  embedded = false,
}: Props) {
  const [studyLevel, setStudyLevel] = useState<JlptLevel>("N5");
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const words = useMemo(() => {
    if (!showLevelFilter) return sourceWords;
    return sourceWords.filter((w) => w.level === studyLevel);
  }, [sourceWords, studyLevel, showLevelFilter]);

  const totalPages =
    words.length === 0 ? 1 : Math.ceil(words.length / PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [studyLevel, showLevelFilter, sourceWords]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const pagedWords = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return words.slice(start, start + PAGE_SIZE);
  }, [words, currentPage]);

  const emptyAll = sourceWords.length === 0;
  const emptyFilter =
    showLevelFilter && sourceWords.length > 0 && words.length === 0;

  const showLevelPillOnRow = !showLevelFilter;

  const pageNavBtn =
    "inline-flex h-10 min-w-[2.75rem] shrink-0 items-center justify-center rounded-xl border border-zinc-200/90 bg-white/90 text-lg font-medium leading-none text-zinc-700 shadow-sm transition [-webkit-tap-highlight-color:transparent] hover:border-pink-300/70 hover:bg-pink-50/80 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-zinc-200/90 disabled:hover:bg-white/90";

  const outerClass = embedded
    ? "w-full"
    : "w-full rounded-2xl border border-zinc-200/70 bg-white/70 p-3 shadow-[0_10px_30px_rgba(24,24,27,0.08)] backdrop-blur-md";

  return (
    <div className={outerClass}>
      {showLevelFilter && (
        <div className="mb-2.5">
          <div className="flex flex-wrap gap-1.5">
            {JLPT_LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => {
                  setStudyLevel(lv);
                  setOpenId(null);
                }}
                className={`${jlptLevelToggleClass(
                  lv,
                  studyLevel === lv
                )} px-2.5 py-1 text-xs`}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>
      )}

      {showLevelFilter && emptyAll && (
        <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-50/60 px-4 py-6 text-center text-sm leading-relaxed text-zinc-600 backdrop-blur-sm">
          아직 공부에서 연 단어가 없습니다.
          <br />
          단어 공부에서 세트를 열어 학습해 보세요.
        </p>
      )}

      {showLevelFilter && emptyFilter && (
        <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-50/60 px-4 py-6 text-center text-sm leading-relaxed text-zinc-600 backdrop-blur-sm">
          {studyLevel} 레벨에 해당하는 단어가 없습니다.
          <br />
          다른 난이도를 선택하거나 단어 공부에서 해당 레벨을 열어 보세요.
        </p>
      )}

      {words.length > 0 ? (
        <>
          <div
            className={
              embedded
                ? "mb-3 flex items-center justify-between gap-2 rounded-xl bg-zinc-50/90 px-2 py-2 ring-1 ring-zinc-200/55"
                : "mb-3 flex items-center justify-between gap-2 rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-2 py-2 shadow-sm"
            }
          >
            <button
              type="button"
              aria-label="이전 페이지"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage <= 0}
              className={pageNavBtn}
            >
              ‹
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-sm font-semibold tabular-nums text-zinc-800">
                {currentPage + 1}{" "}
                <span className="font-normal text-zinc-400">/</span>{" "}
                {totalPages}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-zinc-500">
                총 {words.length}개 · 페이지당 {PAGE_SIZE}개
              </p>
            </div>
            <button
              type="button"
              aria-label="다음 페이지"
              onClick={() =>
                setPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={currentPage >= totalPages - 1}
              className={pageNavBtn}
            >
              ›
            </button>
          </div>
          <ul
            className={`flex flex-col gap-2.5 ${embedded ? "pb-2" : "pb-4"}`}
          >
            {pagedWords.map((w) => {
              const open = openId === w.id;
              return (
                <li key={w.id} className={rowSurface}>
                  <div className="flex items-stretch gap-2 p-2 sm:gap-2.5 sm:p-2.5">
                    {showLevelPillOnRow ? (
                      <span
                        className={`${jlptLevelPillClass(w.level)} self-center`}
                      >
                        {w.level}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : w.id)}
                      className="min-w-0 flex-1 rounded-xl px-1 py-0.5 text-left transition hover:bg-pink-50/40"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
                          {w.kanji?.trim() || w.reading}
                        </span>
                        {w.kanji?.trim() ? (
                          <span className="text-sm text-zinc-600">
                            {w.reading}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-zinc-700">
                        {w.meaning}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-start pt-0.5">
                      <FavoriteStarButton wordId={w.id} />
                    </div>
                  </div>
                  {open ? (
                    <div className="relative border-t border-zinc-200/70 bg-zinc-50/40 px-2 pb-2.5 pt-2 sm:px-3">
                      <div className="pointer-events-none absolute right-4 top-4 z-10">
                        <span className={jlptLevelPillClass(w.level)}>{w.level}</span>
                      </div>
                      <StudyCard
                        data={{
                          kanji: w.kanji,
                          reading: w.reading,
                          meaning: w.meaning,
                          example: w.example,
                          exampleReading: w.exampleReading,
                          exampleMeaning: w.exampleMeaning,
                          wrongCount: w.wrongCount,
                          correctCount: w.correctCount,
                        }}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
