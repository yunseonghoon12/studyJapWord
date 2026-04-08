"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BATCH_SIZE_DEFAULT,
  BATCH_SIZE_MAX,
  BATCH_SIZE_MIN,
  clearClearedBatchCounts,
  getBatchSize,
  resetBatchSize,
  setBatchSize,
} from "@/lib/study-settings";

const PRESETS = [10, 15, 20, 30];

export default function SettingsPage() {
  const router = useRouter();
  const [n, setN] = useState(BATCH_SIZE_DEFAULT);
  const [resettingProgress, setResettingProgress] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setN(getBatchSize());
  }, []);

  const apply = (v: number) => {
    setBatchSize(v);
    setN(v);
  };

  const applyDefault = () => {
    resetBatchSize();
    setN(BATCH_SIZE_DEFAULT);
    setNotice(`세트당 단어 수를 기본값 ${BATCH_SIZE_DEFAULT}개로 되돌렸습니다.`);
  };

  const resetStudyProgress = async () => {
    const ok = window.confirm(
      "지금까지 공부한 단어 진행 상태를 초기화할까요?\n(단어 데이터는 유지되고, 공부한 단어 수만 0개로 돌아갑니다.)"
    );
    if (!ok) return;
    setResettingProgress(true);
    setNotice(null);
    try {
      const res = await fetch("/api/user-word/reset", { method: "POST" });
      if (!res.ok) throw new Error("reset failed");
      clearClearedBatchCounts();
      window.dispatchEvent(new Event("focus"));
      setNotice("공부 진행 상태를 초기화했습니다. (공부한 단어 0개)");
    } catch {
      setNotice("초기화 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setResettingProgress(false);
    }
  };

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← 뒤로
      </button>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">설정</h1>
      <p className="mt-2 text-zinc-600">
        한 세트에 학습할 단어 수입니다. 시험을 통과하면 다음 세트로 넘어갑니다. 기본은{" "}
        {BATCH_SIZE_DEFAULT}개이며, 레벨에 남은 단어가 그보다 적으면 남은 개수 전체가 한
        세트가 됩니다.
      </p>

      <section className="mt-8 rounded-2xl border border-zinc-200/70 bg-white/72 p-5 shadow-sm backdrop-blur-md">
        <h2 className="text-sm font-semibold text-zinc-500">세트당 단어 수</h2>
        <p className="mt-1 text-xs text-zinc-500">
          기본 {BATCH_SIZE_DEFAULT}개 · {BATCH_SIZE_MIN}〜{BATCH_SIZE_MAX} 사이
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => apply(p)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                n === p
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200/70 bg-white/75 text-zinc-800 backdrop-blur-sm hover:bg-pink-50/60"
              }`}
            >
              {p}개
            </button>
          ))}
        </div>
        <label className="mt-6 flex items-center gap-3">
          <span className="text-sm text-zinc-700">직접 입력</span>
          <input
            type="number"
            min={BATCH_SIZE_MIN}
            max={BATCH_SIZE_MAX}
            value={n}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              setN(v);
            }}
            onBlur={() => apply(Math.min(BATCH_SIZE_MAX, Math.max(BATCH_SIZE_MIN, n)))}
            className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={applyDefault}
          className="mt-4 rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-pink-200/80 hover:bg-pink-50/55"
        >
          기본값({BATCH_SIZE_DEFAULT}개)으로 되돌리기
        </button>
      </section>

      <section className="mt-5 rounded-2xl border border-red-200/70 bg-red-50/60 p-5 shadow-sm backdrop-blur-md">
        <h2 className="text-sm font-semibold text-red-700">학습 진행 초기화</h2>
        <p className="mt-1 text-xs leading-relaxed text-red-700/90">
          지금까지 공부해서 연 단어 상태를 모두 초기화합니다. 홈 화면의 학습 단어 수가
          0개로 돌아갑니다.
        </p>
        <button
          type="button"
          onClick={() => void resetStudyProgress()}
          disabled={resettingProgress}
          className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resettingProgress ? "초기화 중…" : "공부 진행 초기화"}
        </button>
      </section>

      {notice ? (
        <p className="mt-4 rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-2 text-sm text-zinc-700">
          {notice}
        </p>
      ) : null}
    </main>
  );
}
