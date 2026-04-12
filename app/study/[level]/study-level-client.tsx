"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudyCard } from "@/components/StudyCard";
import { VocabularyStudyWordsList } from "@/components/vocabulary-study-words-list";
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
  DEFAULT_STUDY_CARD_VISIBILITY,
  getStudyCardVisibility,
  type StudyCardVisibility,
} from "@/lib/study-card-visibility";
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
const WORDS_CACHE_VERSION = 3;

/** StudyCard와 동일: `rounded-xl` + `border-zinc-800`, 배경 없음 */
const bottomNavItem =
  "inline-flex shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-transparent px-2 py-1.5 text-center text-base font-medium leading-snug text-zinc-800 transition-colors duration-200 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] hover:border-pink-400/90 hover:bg-pink-50/55 hover:text-zinc-900 sm:px-2.5 sm:text-[17px]";

function BottomNav({
  onStartTest,
  resultOnlyHome = false,
  hideTest = false,
  settingsHref = "/settings",
}: {
  onStartTest: () => void;
  resultOnlyHome?: boolean;
  /** 세트 없이 연 단어만 볼 때는 통과 시험 숨김 */
  hideTest?: boolean;
  settingsHref?: string;
}) {
  return (
    <nav className="mt-auto flex w-full shrink-0 justify-center px-2 py-1.5 pt-2.5 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] sm:px-3">
      <div className="flex max-w-full items-center justify-center gap-1.5 sm:gap-2">
        {!resultOnlyHome && !hideTest ? (
          <button type="button" onClick={onStartTest} className={bottomNavItem}>
            テスト
          </button>
        ) : null}
        <Link href="/" className={bottomNavItem}>
          ホームへ
        </Link>
        {!resultOnlyHome ? (
          <Link href={settingsHref} className={bottomNavItem}>
            セッティング
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function StudyLevelClient({ level }: { level: string }) {
  const [words, setWords] = useState<WordRow[]>([]);
  /** 세트 선택의「모든 단어」: 이 레벨에서 단어 공부로 연 단어만 한 목록 */
  const [openedBrowseWords, setOpenedBrowseWords] = useState<WordRow[] | null>(
    null
  );
  const [openingAllWords, setOpeningAllWords] = useState(false);
  const [batchSize, setBatchSize] = useState(20);
  const [clearedBatches, setClearedBatches] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
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
  const [visibility, setVisibility] = useState<StudyCardVisibility>(
    DEFAULT_STUDY_CARD_VISIBILITY
  );

  useEffect(() => {
    setBatchSize(getBatchSize());
    setClearedBatches(getClearedBatchCount(level));
    setVisibility(getStudyCardVisibility());
    const qs =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const batchFromUrl = qs?.get("batch");
    if (batchFromUrl !== null && batchFromUrl !== "") {
      const n = Number(batchFromUrl);
      if (Number.isFinite(n) && n >= 1) {
        setSelectedBatch(Math.floor(n) - 1);
        return;
      }
    }
    // 기본 진입은 항상 세트 선택 화면
    setSelectedBatch(null);
    setOpenedBrowseWords(null);
  }, [level]);

  useEffect(() => {
    const sync = () => {
      setBatchSize(getBatchSize());
      setVisibility(getStudyCardVisibility());
    };
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
        const res = await fetch(
          `/api/words?level=${encodeURIComponent(level)}`,
          { cache: "no-store" }
        );
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

  const totalBatches = useMemo(
    () => (batchSize > 0 ? Math.ceil(words.length / batchSize) : 0),
    [words.length, batchSize]
  );

  useEffect(() => {
    if (totalBatches <= 0) return;
    const unlockedMax = Math.min(clearedBatches, totalBatches - 1);
    setSelectedBatch((prev) => (prev === null ? null : Math.min(prev, unlockedMax)));
  }, [clearedBatches, totalBatches]);

  const batchWords = useMemo(() => {
    if (openedBrowseWords !== null) return openedBrowseWords;
    if (selectedBatch === null) return [];
    const start = selectedBatch * batchSize;
    return words.slice(start, start + batchSize);
  }, [words, openedBrowseWords, selectedBatch, batchSize]);

  const pool = useMemo(() => {
    const src = openedBrowseWords ?? words;
    return src.map(toPoolRow);
  }, [openedBrowseWords, words]);

  const current = batchWords[stepIndex];

  useEffect(() => {
    if (phase === "study" && batchWords.length > 0 && !current) {
      setStepIndex(0);
    }
  }, [phase, batchWords.length, current]);

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
    setOpenedBrowseWords((prev) =>
      prev
        ? prev.map((w) =>
            w.id === wordId
              ? {
                  ...w,
                  wrongCount: wrong ? w.wrongCount + 1 : w.wrongCount,
                  correctCount: wrong ? w.correctCount : w.correctCount + 1,
                }
              : w
          )
        : null
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
    if (openedBrowseWords !== null) return;
    if (phase === "study" && current?.id) void markSeenOpen(current.id);
  }, [phase, current?.id, markSeenOpen, openedBrowseWords]);

  const nextCard = () => {
    if (stepIndex + 1 >= batchWords.length) {
      if (openedBrowseWords === null) {
        startBatchExam();
      } else {
        setStepIndex(0);
      }
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const prevCard = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const handleCardSwipe = (offsetX: number, velocityX: number) => {
    // 느린 드래그/빠른 플릭 모두 허용
    const passedByOffset = Math.abs(offsetX) > 120;
    const passedByVelocity = Math.abs(velocityX) > 700;
    if (!passedByOffset && !passedByVelocity) return;
    if (offsetX < 0 || velocityX < 0) {
      nextCard();
    } else {
      prevCard();
    }
  };

  const startBatchExam = () => {
    if (selectedBatch === null) {
      setError("먼저 세트를 선택해 주세요.");
      return;
    }
    const unlockedMax = Math.max(0, clearedBatches);
    if (selectedBatch > unlockedMax) {
      setError("이 세트는 아직 잠겨 있습니다. 이전 세트를 먼저 통과해 주세요.");
      return;
    }
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
        if (nextCleared < totalBatches) {
          setSelectedBatch(nextCleared);
          setStepIndex(0);
        }
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
    selectedBatch,
    totalBatches,
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

  const openBatch = (batchIndex: number) => {
    setOpenedBrowseWords(null);
    setSelectedBatch(batchIndex);
    setStepIndex(0);
    setPhase("study");
    setError(null);
    setExamPicked(null);
    setExamIdx(0);
    setExamQs([]);
    setExamResult(null);
  };

  const exitOpenedBrowse = () => {
    setOpenedBrowseWords(null);
    setStepIndex(0);
    setPhase("study");
    setError(null);
    setExamPicked(null);
    setExamIdx(0);
    setExamQs([]);
    setExamResult(null);
  };

  const openAllOpenedWords = useCallback(async () => {
    setOpeningAllWords(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/words/opened?level=${encodeURIComponent(level)}`,
        { cache: "no-store" }
      );
      const data = await readJsonResponse<{
        words?: WordRow[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
      const list = data.words ?? [];
      if (list.length === 0) {
        setError("아직 이 레벨에서 단어 공부로 연 단어가 없습니다.");
        return;
      }
      setOpenedBrowseWords(list);
      setSelectedBatch(null);
      setStepIndex(0);
      setPhase("study");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setOpeningAllWords(false);
    }
  }, [level]);

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
  const settingsReturnTo = `/study/${encodeURIComponent(level)}${
    selectedBatch !== null ? `?batch=${selectedBatch + 1}` : ""
  }`;
  const settingsHref = `/settings?returnTo=${encodeURIComponent(settingsReturnTo)}`;

  return (
    <main className="mx-auto flex h-dvh max-w-lg flex-col overflow-y-auto px-2 text-[15px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {!loading &&
        !error &&
        phase === "study" &&
        openedBrowseWords === null &&
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

      {!loading &&
        !error &&
        totalBatches > 0 &&
        phase === "study" &&
        selectedBatch === null &&
        openedBrowseWords === null && (
        <section className="mb-2 mt-1 shrink-0 rounded-2xl border border-zinc-200/70 bg-white/70 p-3 shadow-[0_10px_30px_rgba(24,24,27,0.08)] backdrop-blur-md">
          <div className="mb-3 flex items-start justify-between gap-2 px-1">
            <div className="min-w-0 flex flex-1 flex-wrap items-center gap-2">
              <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-zinc-300/70 bg-white/75 px-2.5 text-xs font-semibold text-zinc-700">
                세트 선택
              </span>
              <p className="text-xs text-zinc-500">단계별로 열려요</p>
            </div>
            <button
              type="button"
              disabled={openingAllWords}
              onClick={() => void openAllOpenedWords()}
              className="shrink-0 rounded-full border border-pink-200/90 bg-gradient-to-b from-pink-50/95 to-pink-100/80 px-3 py-1.5 text-xs font-semibold text-pink-950 shadow-[0_2px_8px_rgba(190,24,93,0.12)] transition hover:border-pink-300/90 hover:from-pink-50 hover:to-pink-100 disabled:cursor-wait disabled:opacity-60"
            >
              {openingAllWords ? "불러오는 중…" : "모든 단어"}
            </button>
          </div>
          <div className="pr-1">
            <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: totalBatches }, (_, i) => {
              const unlocked = i <= clearedBatches;
              const active = i === selectedBatch;
              const batchLabel = `第${i + 1}`;
              return (
                <button
                  key={`batch-${i + 1}`}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => openBatch(i)}
                  className={`relative aspect-square rounded-2xl border px-2 py-2 text-lg font-semibold tracking-tight transition ${
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_8px_22px_rgba(24,24,27,0.28)]"
                      : unlocked
                        ? "border-zinc-200/80 bg-white/85 text-zinc-700 shadow-[0_4px_14px_rgba(24,24,27,0.08)] hover:-translate-y-0.5 hover:border-zinc-300/80 hover:bg-white"
                        : "cursor-not-allowed border-zinc-200/80 bg-zinc-100/85 text-zinc-500"
                  }`}
                >
                  <span className={`${unlocked ? "" : "opacity-45"}`}>{batchLabel}</span>
                  {!unlocked ? (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl opacity-60">
                      🔒
                    </span>
                  ) : null}
                </button>
              );
            })}
            </div>
          </div>
        </section>
      )}

      <div
        className={`flex min-h-0 flex-1 flex-col ${
          openedBrowseWords !== null && phase === "study"
            ? "min-h-0 overflow-hidden"
            : "overflow-hidden"
        }`}
      >
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
        {!loading &&
          !error &&
          words.length === 0 &&
          openedBrowseWords === null && (
            <p className="flex flex-1 items-center justify-center text-zinc-500">
              표시할 단어가 없습니다.
            </p>
          )}
        {!loading && !error && words.length > 0 && selectedBatch !== null && batchWords.length === 0 && (
          <p className="flex flex-1 items-center justify-center font-medium text-emerald-800">
            이 레벨의 모든 세트를 완료했습니다.
          </p>
        )}

        {!loading &&
          !error &&
          phase === "study" &&
          openedBrowseWords !== null &&
          openedBrowseWords.length > 0 && (
            <section className="mx-0.5 mb-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70 shadow-[0_10px_30px_rgba(24,24,27,0.08)] backdrop-blur-md">
              <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200/60 px-3 py-3">
                <button
                  type="button"
                  className={`${navBtn} shrink-0 text-sm`}
                  onClick={exitOpenedBrowse}
                >
                  ← 세트 선택
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <span className="inline-flex h-6 items-center rounded-full border border-zinc-300/70 bg-white/75 px-2.5 text-xs font-semibold text-zinc-700">
                    모든 단어
                  </span>
                  <p className="mt-1 text-[11px] leading-tight text-zinc-500">
                    공부에서 연 단어 · {openedBrowseWords.length}개
                  </p>
                </div>
                <div className="w-[5.25rem] shrink-0" aria-hidden />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1 [-webkit-overflow-scrolling:touch]">
                <VocabularyStudyWordsList
                  words={openedBrowseWords}
                  showLevelFilter={false}
                  embedded
                />
              </div>
            </section>
          )}

        {!loading &&
          !error &&
          phase === "study" &&
          openedBrowseWords === null &&
          batchWords.length > 0 &&
          current && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <motion.div
                className="min-h-0 flex-1 overflow-hidden"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                whileTap={{ scale: 0.995 }}
                style={{ touchAction: "pan-y" }}
                onDragEnd={(_, info) => {
                  handleCardSwipe(info.offset.x, info.velocity.x);
                }}
              >
                <StudyCard
                  favoriteWordId={current.id}
                  hideKanji={visibility.hideKanji}
                  hideReading={visibility.hideReading}
                  hideMeaning={visibility.hideMeaning}
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
              </motion.div>
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
        <BottomNav
          onStartTest={startBatchExam}
          resultOnlyHome={phase === "batch-result"}
          hideTest={openedBrowseWords !== null}
          settingsHref={settingsHref}
        />
      )}
    </main>
  );
}
