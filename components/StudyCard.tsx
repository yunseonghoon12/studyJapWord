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
}: {
  data: StudyCardData;
  /** 있으면 카드 오른쪽 상단(정답률 행)에 즐겨찾기 버튼 표시 */
  favoriteWordId?: string;
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
        {favoriteWordId ? (
          <FavoriteStarButton wordId={favoriteWordId} className="-mt-0.5 shrink-0" />
        ) : null}
      </div>

      <div className="shrink-0 text-center">
        {headKanji ? (
          <>
            <p className="text-[clamp(3.25rem,18vw,5.75rem)] font-bold leading-none tracking-wide text-zinc-900">
              {headKanji}
            </p>
            <p className="mt-2 text-2xl font-medium leading-relaxed tracking-wide text-zinc-700 sm:text-3xl">
              {reading}
            </p>
          </>
        ) : (
          <p className="text-[clamp(3.25rem,18vw,5.75rem)] font-bold leading-none tracking-wide text-zinc-900">
            {headFallbackReading}
          </p>
        )}
      </div>

      <div className={`shrink-0 border-t ${inner} pt-3`}>
        <LabeledBlock label="뜻">
          <p className="text-lg font-medium leading-relaxed text-zinc-800 sm:text-xl">
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
