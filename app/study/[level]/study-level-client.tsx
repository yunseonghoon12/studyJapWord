"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudyCard } from "@/components/StudyCard";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import {
  buildQuizQuestionForWord,
  type WordQuizRow,
} from "@/lib/quiz-question";
import { readJsonResponse } from "@/lib/read-json-response";
import type { QuizQuestion } from "@/lib/quiz-types";
import { QUIZ_TYPES, quizTypeLabel } from "@/lib/quiz-types";
import { shuffle } from "@/lib/shuffle";
import {
  getBatchSize,
  getClearedBatchCount,
  setClearedBatchCount,
} from "@/lib/study-settings";

type WordRow = {
  id: string;
  level: string;
  kanji: string | null;
  reading: string;
  meaning: string;
  example: string;
  exampleReading: string | null;
  exampleMeaning: string | null;
  wrongCount: number;
  correctCount: number;
};

type Phase = "study" | "batch-exam" | "batch-result";

function toPoolRow(w: WordRow): WordQuizRow {
  return {
    id: w.id,
    kanji: w.kanji,
    reading: w.reading,
    meaning: w.meaning,
    example: (w.example || "").trim(),
  };
}

const EXAM_QUESTION_TARGET = 12;
const WORDS_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const WORDS_CACHE_VERSION = 1;

/** StudyCard와 동일: `rounded-xl` + `border-zinc-800`, 배경 없음 */
const bottomNavItem =
  "inline-flex shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-transparent px-2 py-1.5 text-center text-base font-medium leading-snug text-zinc-800 transition-colors duration-200 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] hover:border-pink-400/90 hover:bg-pink-50/55 hover:text-zinc-900 sm:px-2.5 sm:text-[17px]";

function BottomNav({
  onStartTest,
  resultOnlyHome = false,
}: {
  onStartTest: () => void;
  resultOnlyHome?: boolean;
}) {
  return (
    <nav className="mt-auto flex w-full shrink-0 justify-center px-2 py-1.5 pt-2.5 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] sm:px-3">
      <div className="flex max-w-full items-center justify-center gap-1.5 sm:gap-2">
        {!resultOnlyHome ? (
          <button type="button" onClick={onStartTest} className={bottomNavItem}>
            テスト
          </button>
        ) : null}
        <Link href="/" className={bottomNavItem}>
          ホームへ
        </Link>
        {!resultOnlyHome ? (
          <Link href="/settings" className={bottomNavItem}>
            セッティング
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function StudyLevelClient({ level }: { level: string }) {
  const [words, setWords] = useState<WordRow[]>([]);
  const [batchSize, setBatchSize] = useState(20);
  const [clearedBatches, setClearedBatches] = useState(0);
  const [phase, setPhase] = useState<Phase>("study");
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [examQs, setExamQs] = useState<QuizQuestion[]>([]);
  const [examIdx, setExamIdx] = useState(0);
  const [examCorrectRunning, setExamCorrectRunning] = useState(0);
  const [examPicked, setExamPicked] = useState<string | null>(null);
  const [examResult, setExamResult] = useState<{
    pass: boolean;
    score: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    setBatchSize(getBatchSize());
    setClearedBatches(getClearedBatchCount(level));
  }, [level]);

  useEffect(() => {
    const sync = () => setBatchSize(getBatchSize());
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cacheKey = `words-level:${level}`;
      const cached = readClientCache<{ words: WordRow[] }>(
        cacheKey,
        WORDS_CACHE_VERSION
      );
      if (cached?.words?.length) {
        setWords(cached.words);
        setStepIndex(0);
        setPhase("study");
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(`/api/words?level=${encodeURIComponent(level)}`);
        const data = await readJsonResponse<{
          words?: WordRow[];
          error?: string;
        }>(res);
        if (!res.ok) throw new Error(data.error ?? "load failed");
        if (!cancelled) {
          const nextWords = data.words ?? [];
          setWords(nextWords);
          setStepIndex(0);
          setPhase("study");
          writeClientCache(
            cacheKey,
            { words: nextWords },
            WORDS_CACHE_TTL_MS,
            WORDS_CACHE_VERSION
          );
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [level]);

  const batchWords = useMemo(() => {
    const start = clearedBatches * batchSize;
    return words.slice(start, start + batchSize);
  }, [words, clearedBatches, batchSize]);

  const pool = useMemo(() => words.map(toPoolRow), [words]);

  const current = batchWords[stepIndex];

  const postStudy = useCallback(async (wordId: string, wrong: boolean) => {
    try {
      await fetch("/api/user-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId,
          wrong,
          ...(!wrong ? { right: true } : {}),
          seen: true,
          fromStudy: true,
        }),
      });
    } catch {
      /* ignore */
    }
    setWords((prev) =>
      prev.map((w) =>
        w.id === wordId
          ? {
              ...w,
              wrongCount: wrong ? w.wrongCount + 1 : w.wrongCount,
              correctCount: wrong ? w.correctCount : w.correctCount + 1,
            }
          : w
      )
    );
  }, []);

  const markSeenOpen = useCallback(async (wordId: string) => {
    try {
      await fetch("/api/user-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId, seen: true, fromStudy: true }),
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (phase === "study" && current?.id) void markSeenOpen(current.id);
  }, [phase, current?.id, markSeenOpen]);

  const nextCard = () => {
    if (stepIndex + 1 >= batchWords.length) {
      startBatchExam();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const prevCard = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const startBatchExam = () => {
    if (batchWords.length < 4) {
      setError(
        "이 세트로는 통과 시험을 만들 수 없습니다. 레벨 단어가 더 필요합니다."
      );
      return;
    }
    setError(null);
    const n = Math.min(EXAM_QUESTION_TARGET, batchWords.length);
    const shuffled = [...batchWords].sort(() => Math.random() - 0.5);
    const typeCycle = shuffle([...QUIZ_TYPES]);
    const qs: QuizQuestion[] = [];
    let ti = 0;
    for (let i = 0; i < n; i++) {
      const w = shuffled[i]!;
      const preferred = typeCycle[ti % typeCycle.length]!;
      ti++;
      const q = buildQuizQuestionForWord(toPoolRow(w), preferred, pool);
      if (!q) continue;
      qs.push(q);
    }
    if (qs.length < 4) {
      setError("세트 시험 문제를 만들 수 없습니다.");
      return;
    }
    setExamQs(qs);
    setExamIdx(0);
    setExamCorrectRunning(0);
    setExamPicked(null);
    setExamResult(null);
    setPhase("batch-exam");
  };

  const submitExamChoice = (
    answer: string,
    el: HTMLButtonElement | null
  ) => {
    const q = examQs[examIdx];
    if (!q || examPicked !== null) return;
    el?.blur();
    setExamPicked(answer);
    void postStudy(q.wordId, answer !== q.correctAnswer);
  };

  const advanceExam = useCallback(() => {
    if (examPicked === null) return;
    const q = examQs[examIdx];
    if (!q) return;
    const got = examPicked === q.correctAnswer;
    const nextScore = examCorrectRunning + (got ? 1 : 0);

    if (examIdx + 1 >= examQs.length) {
      const total = examQs.length;
      const pass = nextScore === total;
      setExamCorrectRunning(nextScore);
      setExamResult({ pass, score: nextScore, total });
      setPhase("batch-result");
      if (pass) {
        const nextCleared = clearedBatches + 1;
        setClearedBatchCount(level, nextCleared);
        setClearedBatches(nextCleared);
      }
      return;
    }

    setExamCorrectRunning(nextScore);
    if (typeof document !== "undefined") {
      const a = document.activeElement;
      if (a instanceof HTMLElement) a.blur();
    }
    setExamIdx((i) => i + 1);
    setExamPicked(null);
  }, [
    examPicked,
    examIdx,
    examQs,
    examCorrectRunning,
    clearedBatches,
    level,
  ]);

  useEffect(() => {
    if (examPicked === null || phase !== "batch-exam") return;
    const t = window.setTimeout(() => advanceExam(), 2000);
    return () => window.clearTimeout(t);
  }, [examPicked, phase, advanceExam]);

  const restartBatch = () => {
    setStepIndex(0);
    setPhase("study");
    setExamResult(null);
    setError(null);
  };

  const leaveExamForStudy = () => {
    setPhase("study");
    setExamQs([]);
    setExamIdx(0);
    setExamPicked(null);
    setExamCorrectRunning(0);
    setExamResult(null);
    setError(null);
  };

  const navBtn =
    "rounded-lg border border-zinc-200/75 bg-white/78 px-4 py-2.5 text-[15px] font-medium text-zinc-800 shadow-sm backdrop-blur-md disabled:cursor-not-allowed disabled:opacity-40 hover:bg-pink-50/65";

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-2 text-[15px]">
      {!loading &&
        !error &&
        phase === "study" &&
        batchWords.length > 0 &&
        current && (
          <header className="flex shrink-0 items-center justify-between gap-2 py-2">
            <button
              type="button"
              className={navBtn}
              disabled={stepIndex <= 0}
              onClick={prevCard}
            >
              이전 단어
            </button>
            <span className="text-xs tabular-nums text-zinc-500">
              {stepIndex + 1}/{batchWords.length}
            </span>
            <button type="button" className={navBtn} onClick={nextCard}>
              다음 단어
            </button>
          </header>
        )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading && (
          <p className="flex flex-1 items-center justify-center text-zinc-500">
            불러오는 중…
          </p>
        )}
        {error && (
          <p className="flex flex-1 items-center justify-center px-2 text-center text-red-600">
            {error}
          </p>
        )}
        {!loading && !error && words.length === 0 && (
          <p className="flex flex-1 items-center justify-center text-zinc-500">
            표시할 단어가 없습니다.
          </p>
        )}
        {!loading && !error && words.length > 0 && batchWords.length === 0 && (
          <p className="flex flex-1 items-center justify-center font-medium text-emerald-800">
            이 레벨의 모든 세트를 완료했습니다.
          </p>
        )}

        {!loading && !error && phase === "study" && batchWords.length > 0 && current && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              <StudyCard
                favoriteWordId={current.id}
                data={{
                  kanji: current.kanji,
                  reading: current.reading,
                  meaning: current.meaning,
                  example: current.example,
                  exampleReading: current.exampleReading,
                  exampleMeaning: current.exampleMeaning,
                  wrongCount: current.wrongCount,
                  correctCount: current.correctCount,
                }}
              />
            </div>
          </div>
        )}

        {!loading && !error && phase === "batch-exam" && examQs.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {(() => {
              const q = examQs[examIdx]!;
              return (
                <>
                  <div className="shrink-0 px-1 pt-5">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                        세트 통과 · {quizTypeLabel(q.type)}
                      </span>
                      <span className="tabular-nums">
                        {examIdx + 1}/{examQs.length}
                      </span>
                    </div>
                  </div>
                  <div className="mx-auto flex w-full min-h-0 flex-1 flex-col justify-center px-1 pb-4">
                    <p
                      className={`text-center font-bold leading-snug text-zinc-900 ${
                        q.type === "example-blank"
                          ? "text-2xl sm:text-3xl"
                          : "text-5xl sm:text-6xl"
                      }`}
                    >
                      {q.prompt}
                    </p>
                    <ul className="mt-6 flex flex-col gap-2">
                      {q.choices.map((c, i) => {
                        const show = examPicked !== null;
                        const isCorrect = c === q.correctAnswer;
                        const isSel = examPicked === c;
                        return (
                          <li key={`${q.id}-${examIdx}-${i}`}>
                            <button
                              type="button"
                              disabled={examPicked !== null}
                              onClick={(e) => submitExamChoice(c, e.currentTarget)}
                              className={`[-webkit-tap-highlight-color:transparent] flex w-full touch-manipulation items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-base transition ${
                                show && isCorrect
                                  ? "border-emerald-600 bg-emerald-100/90 font-medium text-emerald-950 ring-2 ring-emerald-500/40"
                                  : show && isSel && !isCorrect
                                    ? "border-red-500 bg-red-100/90 font-medium text-red-950 ring-2 ring-red-400/50"
                                    : "border-zinc-200/75 bg-white/80 backdrop-blur-sm hover:bg-pink-50/50"
                              }`}
                            >
                              <span className="min-w-0 flex-1 leading-snug">
                                {c}
                              </span>
                              {show && isCorrect ? (
                                <span className="shrink-0 text-xs font-semibold tracking-wide text-red-600 sm:text-sm">
                                  정답
                                </span>
                              ) : null}
                              {show && isSel && !isCorrect ? (
                                <span className="shrink-0 text-xs font-semibold text-red-700 sm:text-sm">
                                  오답
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-5 text-center text-sm leading-relaxed text-zinc-600">
                      모든 문제를 맞혀야 세트 통과입니다. 통과하면 다음 세트가
                      열립니다.
                    </p>
                    {examPicked !== null ? (
                      <p className="mt-3 text-center text-sm text-zinc-500">
                        잠시 후 다음 문제로 넘어갑니다…
                      </p>
                    ) : null}
                  </div>
                  <div
                    className="shrink-0 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2"
                  >
                    <button
                      type="button"
                      onClick={leaveExamForStudy}
                      className="w-full rounded-xl border border-zinc-200/80 bg-white/78 py-3 text-[15px] font-medium text-zinc-800 shadow-sm backdrop-blur-md transition hover:border-pink-200/80 hover:bg-pink-50/55"
                    >
                      단어공부 더 하러가기
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {!loading && !error && phase === "batch-result" && examResult && (
          <div className="flex flex-1 flex-col justify-center px-1 py-4">
            <div className="rounded-xl border border-zinc-200/70 bg-white/75 p-4 shadow-sm backdrop-blur-md">
              <Link
                href={`/study/${encodeURIComponent(level)}`}
                className="mb-3 inline-block rounded-lg border border-zinc-200/80 bg-white/85 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-pink-200/80 hover:bg-pink-50/55"
              >
                단어 공부하러 가기
              </Link>
              {examResult.pass ? (
                <p className="text-lg font-semibold text-emerald-800">
                  세트 통과 ({examResult.score}/{examResult.total})
                </p>
              ) : (
                <>
                  <p className="text-lg font-semibold text-red-800">
                    세트 미통과 ({examResult.score}/{examResult.total})
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">
                    모든 문제를 맞혀야 세트 통과입니다.
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={restartBatch}
                className="mt-4 w-full rounded-xl bg-zinc-900 py-3 text-base font-medium text-white"
              >
                이 세트 다시 공부
              </button>
            </div>
          </div>
        )}
      </div>

      {!loading && !error && phase !== "batch-exam" && (
        <BottomNav onStartTest={startBatchExam} resultOnlyHome={phase === "batch-result"} />
      )}
    </main>
  );
}
