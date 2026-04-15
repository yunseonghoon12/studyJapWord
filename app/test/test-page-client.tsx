"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  JLPT_LEVELS as LEVELS,
  jlptLevelToggleClass,
} from "@/components/jlpt-level-styles";
import { readJsonResponse } from "@/lib/read-json-response";
import type { QuizQuestion } from "@/lib/quiz-types";
import { quizTypeInstruction, quizTypeLabel } from "@/lib/quiz-types";

const CHOICE_STAGGER = 0.065;
const CHOICE_DURATION = 0.35;
const CHOICE_EASE = [0, 0, 0.2, 1] as const;

export function TestPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /** 문자열 키로만 파생해 `searchParams` 참조 변경으로 인한 중복 fetch를 줄입니다. */
  const queryKey = searchParams.toString();

  const { level, setMode } = useMemo(() => {
    const params = new URLSearchParams(queryKey);
    const lv = params.get("level");
    const levelResolved =
      lv && LEVELS.includes(lv as (typeof LEVELS)[number]) ? lv : "N5";
    const s = params.get("set");
    const bs = params.get("batchSize");
    const setModeResolved =
      s !== null && s !== ""
        ? { setIndex: s, batchSize: bs ?? "20" }
        : null;
    return { level: levelResolved, setMode: setModeResolved };
  }, [queryKey]);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [needsStudy, setNeedsStudy] = useState(false);
  const [emptySet, setEmptySet] = useState(false);
  const [insufficientLevel, setInsufficientLevel] = useState(false);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSetPractice = setMode !== null;

  useEffect(() => {
    const ac = new AbortController();

    setLoading(true);
    setError(null);
    setPicked(null);
    setEmptySet(false);
    setInsufficientLevel(false);

    const params = new URLSearchParams({
      level,
      limit: "12",
    });
    if (setMode) {
      params.set("set", setMode.setIndex);
      params.set("batchSize", setMode.batchSize);
    }

    (async () => {
      try {
        const res = await fetch(`/api/test?${params.toString()}`, {
          signal: ac.signal,
        });
        const data = await readJsonResponse<{
          questions?: QuizQuestion[];
          needsStudy?: boolean;
          emptySet?: boolean;
          insufficientLevel?: boolean;
          error?: string;
        }>(res);
        if (!res.ok)
          throw new Error(data.error ?? "시험을 불러올 수 없습니다.");
        if (ac.signal.aborted) return;
        setQuestions(data.questions ?? []);
        setNeedsStudy(Boolean(data.needsStudy));
        setEmptySet(Boolean(data.emptySet));
        setInsufficientLevel(Boolean(data.insufficientLevel));
        setQi(0);
      } catch (e) {
        if (ac.signal.aborted || (e instanceof Error && e.name === "AbortError"))
          return;
        setError(e instanceof Error ? e.message : "오류");
        setQuestions([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [level, setMode]);

  const q = questions[qi];
  const done = questions.length > 0 && qi >= questions.length;

  const submitAnswer = useCallback(
    async (answer: string, el: HTMLButtonElement | null) => {
      if (!q || picked !== null) return;
      el?.blur();
      setPicked(answer);
      const ok = answer === q.correctAnswer;
      try {
        if (!ok) {
          await fetch("/api/user-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wordId: q.wordId,
              wrong: true,
              seen: true,
            }),
          });
        } else {
          await fetch("/api/user-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wordId: q.wordId, right: true, seen: true }),
          });
        }
      } catch {
        /* ignore */
      }
    },
    [q, picked]
  );

  const nextQ = useCallback(() => {
    if (typeof document !== "undefined") {
      const a = document.activeElement;
      if (a instanceof HTMLElement) a.blur();
    }
    setPicked(null);
    setQi((i) => i + 1);
  }, []);

  /** 답 선택 후 2초 뒤 자동으로 다음 문제 */
  useEffect(() => {
    if (picked === null || !q) return;
    const timer = window.setTimeout(() => {
      nextQ();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [picked, q?.id, nextQ]);

  const onPickLevel = (lv: string) => {
    router.replace(`/test?level=${encodeURIComponent(lv)}`, { scroll: false });
  };

  const reduceMotion = useReducedMotion();
  const choiceContainer = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduceMotion ? 0 : CHOICE_STAGGER,
          delayChildren: 0,
        },
      },
    }),
    [reduceMotion]
  );
  const choiceItem = useMemo(
    () => ({
      hidden: { opacity: 0, y: 80 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: reduceMotion ? 0 : CHOICE_DURATION,
          ease: CHOICE_EASE,
        },
      },
    }),
    [reduceMotion]
  );

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          ← 뒤로
        </button>
      </div>

      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">시험</h1>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        {isSetPractice ? (
          questions.length > 0 ? (
            <>
              세트 통과 시험 · {level} ({questions.length}문제)
            </>
          ) : (
            <>세트 통과 시험 · {level}</>
          )
        ) : (
          <>
            <span className="block">
              {level} · 단어 학습에서 학습한 한자만 출제됩니다.
            </span>
            <span className="mt-1 block">틀린 단어는 더 자주 나옵니다.</span>
          </>
        )}
      </p>

      {!isSetPractice && (
        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500">난이도</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => onPickLevel(lv)}
                className={jlptLevelToggleClass(lv, level === lv)}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <p className="mt-10 text-center text-lg text-zinc-500">문제 생성 중…</p>
      )}
      {error && !loading && (
        <p className="mt-10 text-center text-lg text-red-600">{error}</p>
      )}

      {!loading &&
        !error &&
        !isSetPractice &&
        needsStudy &&
        questions.length === 0 && (
          <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <p className="font-medium">
              {level}에서 아직 시험할 단어가 없습니다.
            </p>
            <p className="mt-2 text-sm leading-relaxed opacity-90">
              메인 시험은 단어 공부에서 연 한자만 나옵니다. 먼저「단어 공부」에서
              해당 레벨 세트 학습을 진행한 뒤 시험을 보세요.
            </p>
          </div>
        )}

      {!loading && !error && isSetPractice && emptySet && (
        <div className="mt-10 rounded-xl border border-zinc-200/70 bg-zinc-50/65 p-5 text-zinc-800 backdrop-blur-md">
          <p className="font-medium">이 세트에 풀 문제가 없습니다.</p>
          <p className="mt-2 text-sm text-zinc-600">
            단어 공부에서 세트를 선택했는지 확인하거나, 레벨에 단어가 있는지
            확인해 주세요.
          </p>
        </div>
      )}

      {!loading && !error && isSetPractice && insufficientLevel && (
        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <p className="font-medium">문제를 만들 수 없습니다.</p>
          <p className="mt-2 text-sm">
            객관식은 같은 레벨에서 최소 4개 이상의 단어가 필요합니다.
          </p>
        </div>
      )}

      {!loading && !error && questions.length > 0 && !done && q && (
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-sm text-zinc-500">
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-800">
              {quizTypeLabel(q.type)}
            </span>
            <span className="tabular-nums">
              {qi + 1} / {questions.length}
            </span>
          </div>
          <p className="font-semibold leading-snug text-zinc-900 text-2xl sm:text-3xl">
            {q.prompt}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {quizTypeInstruction(q.type)}
          </p>

          <motion.ul
            key={`${q.id}-${qi}`}
            className="mt-6 flex flex-col gap-2"
            variants={choiceContainer}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
          >
            {q.choices.map((c, i) => {
              const isSel = picked === c;
              const isCorrect = c === q.correctAnswer;
              const show = picked !== null;
              return (
                <motion.li
                  key={`${q.id}-${qi}-${i}`}
                  variants={choiceItem}
                  className="min-w-0"
                >
                  <button
                    type="button"
                    disabled={picked !== null}
                    onClick={(e) => void submitAnswer(c, e.currentTarget)}
                    className={`[-webkit-tap-highlight-color:transparent] flex w-full touch-manipulation items-center justify-between gap-3 rounded-xl border px-4 py-4 text-left text-lg transition-colors duration-200 ${
                      show && isCorrect
                        ? "border-emerald-600 bg-emerald-100/90 font-medium text-emerald-950 ring-2 ring-emerald-500/40"
                        : show && isSel && !isCorrect
                          ? "border-red-500 bg-red-100/90 font-medium text-red-950 ring-2 ring-red-400/50"
                          : "border-zinc-200/75 bg-white/80 backdrop-blur-sm hover:border-pink-200/80 hover:bg-pink-50/50"
                    }`}
                  >
                    <span className="min-w-0 flex-1 leading-snug">{c}</span>
                    {show && isCorrect ? (
                      <span className="shrink-0 text-sm font-semibold tracking-wide text-red-600">
                        정답
                      </span>
                    ) : null}
                    {show && isSel && !isCorrect ? (
                      <span className="shrink-0 text-sm font-semibold text-red-700">
                        오답
                      </span>
                    ) : null}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>

          {picked !== null && (
            <p className="mt-4 text-center text-sm text-zinc-500">
              잠시 후 다음 문제로 넘어갑니다…
            </p>
          )}
        </div>
      )}

      {!loading && !error && questions.length > 0 && done && (
        <p className="mt-10 text-center text-xl font-medium text-zinc-800">
          이번 세트를 모두 풀었습니다.
        </p>
      )}
    </main>
  );
}
