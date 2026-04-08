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
const EXAM_PASS_RATIO = 0.75;
const WORDS_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const WORDS_CACHE_VERSION = 1;

const bottomNavItem =
  "rounded-lg border border-zinc-200/75 bg-white/78 px-3 py-2 text-center text-sm font-medium text-zinc-800 shadow-sm backdrop-blur-md transition-colors duration-200 hover:border-zinc-950 hover:bg-zinc-900 hover:text-white active:bg-zinc-950";

function BottomNav({ testHref }: { testHref: string }) {
  return (
    <nav className="mt-auto flex shrink-0 items-stretch justify-center gap-2 border-t border-zinc-200/60 bg-white/52 px-2 py-2 backdrop-blur-md sm:gap-4">
      <Link href={testHref} className={bottomNavItem}>
        테스트
      </Link>
      <Link href="/" className={bottomNavItem}>
        홈
      </Link>
      <Link href="/settings" className={bottomNavItem}>
        설정
      </Link>
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

  const setTestHref = `/test?level=${encodeURIComponent(level)}&set=${clearedBatches}&batchSize=${batchSize}`;

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

  const submitExamChoice = (answer: string) => {
    const q = examQs[examIdx];
    if (!q || examPicked !== null) return;
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
      const passNeeded = Math.ceil(total * EXAM_PASS_RATIO);
      const pass = nextScore >= passNeeded;
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

  const navBtn =
    "rounded-lg border border-zinc-200/75 bg-white/78 px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm backdrop-blur-md disabled:cursor-not-allowed disabled:opacity-40 hover:bg-pink-50/65";

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-2">
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
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-2">
            {(() => {
              const q = examQs[examIdx]!;
              return (
                <>
                  <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                      세트 통과 · {quizTypeLabel(q.type)}
                    </span>
                    <span className="tabular-nums">
                      {examIdx + 1}/{examQs.length}
                    </span>
                  </div>
                  <p
                    className={`text-center font-bold text-zinc-900 ${
                      q.type === "example-blank"
                        ? "text-lg leading-snug sm:text-xl"
                        : "text-4xl"
                    }`}
                  >
                    {q.prompt}
                  </p>
                  <ul className="mt-4 flex flex-col gap-2">
                    {q.choices.map((c) => {
                      const show = examPicked !== null;
                      const isCorrect = c === q.correctAnswer;
                      const isSel = examPicked === c;
                      return (
                        <li key={c}>
                          <button
                            type="button"
                            disabled={examPicked !== null}
                            onClick={() => submitExamChoice(c)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-base transition ${
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
                  {examPicked !== null && (
                    <p className="mt-4 text-center text-sm text-zinc-500">
                      잠시 후 다음 문제로 넘어갑니다…
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {!loading && !error && phase === "batch-result" && examResult && (
          <div className="flex flex-1 flex-col justify-center px-1 py-4">
            <div className="rounded-xl border border-zinc-200/70 bg-white/75 p-4 shadow-sm backdrop-blur-md">
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
                    {Math.ceil(examResult.total * EXAM_PASS_RATIO)}개 이상 맞아야
                    통과입니다.
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

      {!loading && !error && <BottomNav testHref={setTestHref} />}
    </main>
  );
}
