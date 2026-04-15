"use client";

import type { ReactNode } from "react";
import { FavoriteStarButton } from "@/components/FavoriteStarButton";

export type StudyCardData = {
  kanji?: string | null;
  reading: string;
  meaning: string;
  example: string;
  exampleReading?: string | null;
  exampleMeaning?: string | null;
  wrongCount?: number;
  correctCount?: number;
};

function LabeledBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-normal text-zinc-500">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** 한자 크게, 읽기는 한자 바로 아래. 예문·읽기 비중 확대 */
export function StudyCard({
  data,
  favoriteWordId,
  hideKanji = false,
  hideReading = false,
  hideMeaning = false,
  readingMeaningMasked = false,
  onToggleReadingMeaningMask,
}: {
  data: StudyCardData;
  /** 있으면 카드 오른쪽 상단(정답률 행)에 즐겨찾기 버튼 표시 */
  favoriteWordId?: string;
  hideKanji?: boolean;
  hideReading?: boolean;
  hideMeaning?: boolean;
  /** 스터디 화면 전용: 히라가나/뜻 빠른 가리기 토글 상태 */
  readingMeaningMasked?: boolean;
  /** 스터디 화면 전용: 히라가나/뜻 빠른 가리기 토글 핸들러 */
  onToggleReadingMeaningMask?: () => void;
}) {
  const reading = data.reading?.trim() || "—";
  const meaning = data.meaning?.trim() || "—";
  const example = data.example?.trim() || "—";
  const exRead = data.exampleReading?.trim() || "—";
  const exMean = data.exampleMeaning?.trim() || "—";
  const kanji = data.kanji?.trim();
  const wrong = typeof data.wrongCount === "number" ? data.wrongCount : 0;
  const correct = typeof data.correctCount === "number" ? data.correctCount : 0;
  const gradedTotal = correct + wrong;
  const accuracyPct =
    gradedTotal > 0
      ? `${Math.round((correct / gradedTotal) * 100)}%`
      : null;

  const headKanji = kanji || null;
  const headFallbackReading = !kanji ? reading : null;

  /** 카드 외곽만 짙은 선; 안쪽 구분은 연한 선 */
  const outer = "border-zinc-800";
  const inner = "border-zinc-700/55";
  const maskClass =
    "select-none text-transparent [filter:blur(14px)] [text-shadow:0_0_18px_rgba(39,39,42,0.98)]";

  return (
    <article
      className={`flex h-full min-h-0 flex-col gap-3 rounded-xl border ${outer} bg-white/72 px-3 py-3 shadow-sm backdrop-blur-md sm:px-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 pr-1">
          {accuracyPct != null ? (
            <p className="text-xs text-zinc-600">
              정답률{" "}
              <span className="font-medium tabular-nums text-zinc-900">
                {accuracyPct}
              </span>
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-zinc-500">
              시험이 끝나면 정답률을 확인할 수 있어요.
            </p>
          )}
        </div>
        {(onToggleReadingMeaningMask || favoriteWordId) && (
          <div className="flex shrink-0 items-center gap-1">
            {onToggleReadingMeaningMask ? (
              <button
                type="button"
                onClick={onToggleReadingMeaningMask}
                aria-label={
                  readingMeaningMasked
                    ? "히라가나와 뜻 가리기 해제"
                    : "히라가나와 뜻 가리기"
                }
                aria-pressed={readingMeaningMasked}
                className={`-mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200/75 bg-white/78 shadow-sm backdrop-blur-md transition hover:bg-pink-50/55 ${
                  readingMeaningMasked ? "text-zinc-700" : "text-zinc-500"
                }`}
              >
                {readingMeaningMasked ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 stroke-current"
                    strokeWidth={1.8}
                  >
                    <path
                      d="M3 3l18 18M10.6 10.6a2 2 0 102.8 2.8M9.9 5.1A10.9 10.9 0 0112 5c5.7 0 9.9 4.3 11 7-1 2.4-4.3 5.9-8.9 6.8M6.1 6.1C3.9 7.6 2.4 9.8 2 12c.6 1.7 2.7 4.6 6 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 stroke-current"
                    strokeWidth={1.8}
                  >
                    <path
                      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            ) : null}
            {favoriteWordId ? (
              <FavoriteStarButton wordId={favoriteWordId} className="-mt-0.5 shrink-0" />
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 text-center">
        {headKanji ? (
          <>
            <p
              className={`text-[clamp(3.25rem,18vw,5.75rem)] font-bold leading-none tracking-wide text-zinc-900 ${
                hideKanji ? maskClass : ""
              }`}
            >
              {headKanji}
            </p>
            <p
              className={`mt-2 text-2xl font-medium leading-relaxed tracking-wide text-zinc-700 sm:text-3xl ${
                hideReading ? maskClass : ""
              }`}
            >
              {reading}
            </p>
          </>
        ) : (
          <p
            className={`text-[clamp(3.25rem,18vw,5.75rem)] font-bold leading-none tracking-wide text-zinc-900 ${
              hideReading ? maskClass : ""
            }`}
          >
            {headFallbackReading}
          </p>
        )}
      </div>

      <div className={`shrink-0 border-t ${inner} pt-3`}>
        <LabeledBlock label="뜻">
          <p
            className={`text-lg font-medium leading-relaxed text-zinc-800 sm:text-xl ${
              hideMeaning ? maskClass : ""
            }`}
          >
            {meaning}
          </p>
        </LabeledBlock>
      </div>

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-5 border-t ${inner} pt-4`}
      >
        <LabeledBlock label="예문">
          <p className="text-xl font-normal leading-loose text-zinc-900 sm:text-2xl">
            {example}
          </p>
        </LabeledBlock>
        <LabeledBlock label="예문 (히라가나)">
          <p className="text-lg font-normal leading-loose text-zinc-800 sm:text-xl">
            {exRead}
          </p>
        </LabeledBlock>
        <LabeledBlock label="예문 해석">
          <p className="text-base font-normal leading-relaxed text-zinc-800 sm:text-lg">
            {exMean}
          </p>
        </LabeledBlock>
      </div>
    </article>
  );
}
